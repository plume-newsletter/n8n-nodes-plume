import { createHmac, timingSafeEqual } from 'crypto';

const PREFIX = 'sha256=';

// Mirrors plume's webhook signing: X-Plume-Signature = "sha256=" +
// hex(hmac_sha256(secret, raw request body)).
export function verifySignature(
	secret: string,
	rawBody: Buffer,
	header: string | undefined,
): boolean {
	if (!header || !header.startsWith(PREFIX)) return false;
	const gotHex = header.slice(PREFIX.length);
	if (!/^[0-9a-f]+$/.test(gotHex)) return false;
	const expected = createHmac('sha256', secret).update(rawBody).digest();
	const got = Buffer.from(gotHex, 'hex');
	if (got.length !== expected.length) return false;
	return timingSafeEqual(got, expected);
}
