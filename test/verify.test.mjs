import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySignature } from '../dist/nodes/PlumeTrigger/verify.js';

const secret = 'whsec_testsecret';
const body = Buffer.from(JSON.stringify({ event: 'subscriber.created', data: { email: 'a@b.c' } }));
const goodSig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

test('accepts a valid signature', () => {
	assert.equal(verifySignature(secret, body, goodSig), true);
});

test('rejects a tampered body', () => {
	assert.equal(verifySignature(secret, Buffer.from('{"event":"evil"}'), goodSig), false);
});

test('rejects a wrong secret', () => {
	const otherSig = 'sha256=' + createHmac('sha256', 'whsec_other').update(body).digest('hex');
	assert.equal(verifySignature(secret, body, otherSig), false);
});

test('rejects missing or malformed headers', () => {
	assert.equal(verifySignature(secret, body, undefined), false);
	assert.equal(verifySignature(secret, body, ''), false);
	assert.equal(verifySignature(secret, body, 'md5=abc'), false);
	assert.equal(verifySignature(secret, body, 'sha256=nothex!!'), false);
	assert.equal(verifySignature(secret, body, 'sha256=abcd'), false); // wrong length
});
