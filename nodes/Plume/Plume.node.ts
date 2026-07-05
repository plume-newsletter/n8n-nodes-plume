import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { plumeApiRequest } from '../PlumeTrigger/GenericFunctions';

// Plume list endpoints return bare arrays; be tolerant of a wrapped
// {items: []} shape so a future API change degrades gracefully.
function asArray(res: unknown): Array<{ id: string; name?: string; subject?: string }> {
	if (Array.isArray(res)) return res;
	if (res && typeof res === 'object') {
		const firstArray = Object.values(res).find(Array.isArray);
		if (firstArray) return firstArray as Array<{ id: string; name?: string }>;
	}
	return [];
}

export class Plume implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Plume',
		name: 'plume',
		icon: 'file:plume.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage subscribers and campaigns in a Plume newsletter instance',
		defaults: { name: 'Plume' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'plumeApi', required: true }],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/+$"), "")}}/api',
			headers: { 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'subscriber',
				options: [
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'List', value: 'list' },
					{ name: 'Segment', value: 'segment' },
					{ name: 'Subscriber', value: 'subscriber' },
				],
			},

			// ------------------------- subscriber -------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['subscriber'] } },
				default: 'create',
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a subscriber',
						routing: {
							request: {
								method: 'POST',
								url: '=/lists/{{$parameter.listId}}/subscribers',
							},
						},
					},
					{
						name: 'Unsubscribe',
						value: 'unsubscribe',
						action: 'Unsubscribe a subscriber',
						routing: {
							request: {
								method: 'PUT',
								url: '=/subscribers/{{$parameter.subscriberId}}/status',
								body: { status: 'unsubscribed' },
							},
						},
					},
				],
			},
			{
				displayName: 'List Name or ID',
				name: 'listId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLists' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['subscriber'], operation: ['create'] } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['subscriber'], operation: ['create'] } },
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['subscriber'], operation: ['create'] } },
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Subscriber ID',
				name: 'subscriberId',
				type: 'string',
				required: true,
				default: '',
				description: 'UUID of the subscriber (e.g. from a Plume Trigger event)',
				displayOptions: { show: { resource: ['subscriber'], operation: ['unsubscribe'] } },
			},

			// ------------------------- campaign -------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['campaign'] } },
				default: 'create',
				options: [
					{
						name: 'Create Draft',
						value: 'create',
						action: 'Create a campaign draft',
						routing: { request: { method: 'POST', url: '/campaigns' } },
					},
					{
						name: 'Send',
						value: 'send',
						action: 'Send a campaign',
						routing: {
							request: { method: 'POST', url: '=/campaigns/{{$parameter.campaignId}}/send' },
						},
					},
				],
			},
			{
				displayName: 'Brand Name or ID',
				name: 'brandId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getBrands' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['campaign'], operation: ['create'] } },
				routing: { send: { type: 'body', property: 'brandId' } },
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['campaign'], operation: ['create'] } },
				routing: { send: { type: 'body', property: 'subject' } },
			},
			{
				displayName: 'HTML Body',
				name: 'htmlBody',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				displayOptions: { show: { resource: ['campaign'], operation: ['create'] } },
				routing: { send: { type: 'body', property: 'htmlBody' } },
			},
			{
				displayName: 'Plain Text Body',
				name: 'plainBody',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				displayOptions: { show: { resource: ['campaign'], operation: ['create'] } },
				routing: { send: { type: 'body', property: 'plainBody' } },
			},
			{
				displayName: 'Campaign Name or ID',
				name: 'campaignId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getCampaigns' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['campaign'], operation: ['send'] } },
			},
			{
				displayName: 'Send To',
				name: 'sendTo',
				type: 'options',
				noDataExpression: true,
				default: 'list',
				options: [
					{ name: 'List', value: 'list' },
					{ name: 'Segment', value: 'segment' },
				],
				displayOptions: { show: { resource: ['campaign'], operation: ['send'] } },
			},
			{
				displayName: 'List Name or ID',
				name: 'sendListId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLists' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: {
					show: { resource: ['campaign'], operation: ['send'], sendTo: ['list'] },
				},
				routing: { send: { type: 'body', property: 'listId' } },
			},
			{
				displayName: 'Segment Name or ID',
				name: 'sendSegmentId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getSegments' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: {
					show: { resource: ['campaign'], operation: ['send'], sendTo: ['segment'] },
				},
				routing: { send: { type: 'body', property: 'segmentId' } },
			},

			// ------------------------- list -------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['list'] } },
				default: 'getAll',
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many lists',
						routing: { request: { method: 'GET', url: '/lists' } },
					},
				],
			},

			// ------------------------- segment -------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['segment'] } },
				default: 'getAll',
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many segments',
						routing: { request: { method: 'GET', url: '/segments' } },
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const res = await plumeApiRequest.call(this, 'GET', '/lists');
				return asArray(res).map((l) => ({ name: l.name ?? l.id, value: l.id }));
			},
			async getSegments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const res = await plumeApiRequest.call(this, 'GET', '/segments');
				return asArray(res).map((s) => ({ name: s.name ?? s.id, value: s.id }));
			},
			async getBrands(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const res = await plumeApiRequest.call(this, 'GET', '/brands');
				return asArray(res).map((b) => ({ name: b.name ?? b.id, value: b.id }));
			},
			async getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const res = await plumeApiRequest.call(this, 'GET', '/campaigns');
				return asArray(res).map((c) => ({ name: c.subject ?? c.name ?? c.id, value: c.id }));
			},
		},
	};
}
