import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';

import { plumeApiRequest } from './GenericFunctions';
import { verifySignature } from './verify';

interface PlumeWebhookEndpoint {
	id: string;
	url: string;
	secret: string;
	events: string[];
}

export class PlumeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Plume Trigger',
		name: 'plumeTrigger',
		icon: 'file:plume.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow on Plume newsletter events',
		defaults: { name: 'Plume Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'plumeApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: [
					{
						name: 'Campaign Sent',
						value: 'campaign.sent',
						description: 'A campaign finished being enqueued to all recipients',
					},
					{
						name: 'Subscriber Confirmed',
						value: 'subscriber.confirmed',
						description: 'A subscriber confirmed via double opt-in',
					},
					{
						name: 'Subscriber Created',
						value: 'subscriber.created',
						description: 'A new subscriber was added',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const res = (await plumeApiRequest.call(this, 'GET', '/webhooks')) as {
					endpoints?: PlumeWebhookEndpoint[];
				};
				const existing = (res.endpoints ?? []).find((ep) => ep.url === webhookUrl);
				if (existing) {
					const data = this.getWorkflowStaticData('node');
					data.webhookId = existing.id;
					data.secret = existing.secret;
					return true;
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const created = (await plumeApiRequest.call(this, 'POST', '/webhooks', {
					url: webhookUrl,
					events,
				})) as PlumeWebhookEndpoint;
				const data = this.getWorkflowStaticData('node');
				data.webhookId = created.id;
				data.secret = created.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (data.webhookId) {
					try {
						await plumeApiRequest.call(this, 'DELETE', `/webhooks/${data.webhookId}`);
					} catch {
						// Endpoint already gone on the Plume side — nothing to clean up.
					}
					delete data.webhookId;
					delete data.secret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const secret = this.getWorkflowStaticData('node').secret as string | undefined;
		const signature = req.headers['x-plume-signature'] as string | undefined;
		// n8n exposes the raw request bytes as rawBody; fall back to
		// re-serializing the parsed body (only hit if a proxy strips rawBody).
		const rawBody: Buffer =
			(req as unknown as { rawBody?: Buffer }).rawBody ??
			Buffer.from(JSON.stringify(this.getBodyData()));

		if (!secret || !verifySignature(secret, rawBody, signature)) {
			const res = this.getResponseObject();
			res.status(401).json({ message: 'invalid signature' });
			return { noWebhookResponse: true };
		}

		const body = this.getBodyData() as IDataObject;
		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
