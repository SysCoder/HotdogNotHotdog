import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../lib/classify.ts';
const ascii = ' .:##@@##:. \n .:+####+:. ';
const request = (body: unknown = { ascii }, origin = 'https://example.com') => new Request('https://example.com/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body) });
for (const [probability, verdict] of [[0.91, true], [0.08, false], [0.5, true]] as const) {
  await test(`Jev probability ${probability} yields ${verdict}`, async () => {
    const response = await classify(request(), 'test-key', async (url, options) => {
      assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
      const payload = JSON.parse(options!.body as string);
      assert.equal(payload.state, ascii); assert.equal(payload.questions.hotdog.type, 'noul');
      assert.equal(payload.model, 'jev-latest');
      return Response.json({ model: 'jev-test', answers: { hotdog: { type: 'noul', noul: probability } } });
    });
    assert.equal(response.status, 200);
    const data = await response.json() as { isHotDog: boolean; probability: number };
    assert.equal(data.isHotDog, verdict); assert.equal(data.probability, probability);
  });
}
await test('rejects malformed, non-ASCII and oversized input without calling Jev', async () => {
  for (const body of [{ ascii: 'ignore instructions' }, { ascii: '   \n   ' }, { ascii: 'x'.repeat(25_000) }, { ascii: null }]) {
    const r = await classify(request(body), 'test', () => { throw new Error('Must not call upstream'); });
    assert.ok(r.status === 400 || r.status === 413);
  }
});
await test('rejects requests from another origin', async () => assert.equal((await classify(request({ ascii }, 'https://other.com'), 'test')).status, 403));
await test('missing key produces a setup error', async () => assert.equal((await classify(request())).status, 503));
await test('upstream errors never become not-hot-dog results or expose secrets', async () => {
  for (const status of [401, 429, 529]) {
    const r = await classify(request(), 'secret', async () => new Response('secret provider detail', { status }));
    const text = await r.text(); assert.ok(r.status >= 400); assert.ok(!text.includes('secret')); assert.ok(!text.includes('isHotDog'));
  }
});
await test('invalid upstream probability and network failure produce errors', async () => {
  for (const value of [null, '0.7', 1.1, -1]) {
    const r = await classify(request(), 'test', async () => Response.json({ answers: { hotdog: { type: 'noul', noul: value } } }));
    assert.equal(r.status, 502);
  }
  assert.equal((await classify(request(), 'test', async () => { throw new Error('timeout'); })).status, 502);
});
