import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PlumeApi implements ICredentialType {
	name = 'plumeApi';

	displayName = 'Plume API';

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased
	documentationUrl = 'https://plumenewsletter.com/docs/rest-api';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://news.example.com',
			description: 'The URL of your Plume instance, without a trailing slash or /api',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'A Plume API key (Settings → API Keys), starts with plume_',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/+$"), "")}}',
			// /api/lists, not /api/me: the me endpoint reads the session cookie
			// directly and never accepts Bearer keys (plume auth_handlers.go).
			url: '/api/lists',
		},
	};
}
