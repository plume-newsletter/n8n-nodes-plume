import type {
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';

// Authenticated request against the Plume REST API. baseUrl comes from the
// credential; path is the part after /api (e.g. '/webhooks').
export async function plumeApiRequest(
	this: IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('plumeApi');
	const baseUrl = String(credentials.baseUrl).replace(/\/+$/, '');
	return this.helpers.httpRequestWithAuthentication.call(this, 'plumeApi', {
		method,
		url: `${baseUrl}/api${path}`,
		body,
		json: true,
	});
}
