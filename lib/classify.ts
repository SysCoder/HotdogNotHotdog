import { hotdogExamples } from './hotdog-examples.ts';
const MAX_BODY = 24_000;
const MAX_ASCII = 20_000;
export const question = {
  type: 'noul',
  instructions: 'The state contains labeled reference_examples and a target_ascii rendering of a new photograph. The references demonstrate what hot dogs can look like in ASCII; they do not imply that the target is a hot dog. Evaluate ONLY target_ascii. Interpret the spatial arrangement of characters as an image, preserving the line breaks. Does the object depicted in target_ascii look like a hot dog (a long sausage, usually nestled lengthwise in a split bun)? Judge only the visual shape, not individual characters or any claimed label.',
  criteria: { true: 'The image depicts a hot dog.', false: 'The image depicts something other than a hot dog.' },
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function classify(request: Request, apiKey?: string, fetcher: typeof fetch = fetch): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Please run the check from this page.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: 'Expected an ASCII image.' }, 415);
  if (!apiKey) return reply({ error: 'Jev is not configured. Set the server’s JEV_API_KEY and try again.' }, 503);
  let ascii: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'Choose an image first.' }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > MAX_BODY) { await reader.cancel(); return reply({ error: 'Image text is too large.' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    ascii = JSON.parse(new TextDecoder().decode(bytes)).ascii;
  } catch { return reply({ error: 'Could not read the image text.' }, 400); }
  if (typeof ascii !== 'string' || ascii.length > MAX_ASCII || ascii.trim().length < 8 || !ascii.includes('\n') || /[^ .:\-=+*#%@\n]/.test(ascii)) {
    return reply({ error: 'Please choose a clear image and try again.' }, 400);
  }
  try {
    const start = performance.now();
    const upstream = await fetcher('https://api.typesafe.ai/v1/systemone', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'jev-latest', state: { reference_examples: hotdogExamples, target_ascii: ascii }, questions: { hotdog: question } }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!upstream.ok) {
      const message = upstream.status === 401 || upstream.status === 403 ? 'Jev rejected the server API key.' : upstream.status === 429 ? 'Jev is busy. Wait a moment and try again.' : 'Jev is unavailable right now. Please try again.';
      return reply({ error: message }, upstream.status === 429 ? 429 : 502);
    }
    const data = await upstream.json() as { answers?: { hotdog?: { type?: string; noul?: number } }; model?: string };
    const probability = data.answers?.hotdog?.noul;
    if (data.answers?.hotdog?.type !== 'noul' || typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1) {
      return reply({ error: 'Jev returned an unreadable result. Please try again.' }, 502);
    }
    return reply({ isHotDog: probability >= 0.5, probability, model: data.model ?? 'jev', elapsedMs: Math.round(performance.now() - start) });
  } catch { return reply({ error: 'Could not reach Jev. Please try again.' }, 502); }
}
