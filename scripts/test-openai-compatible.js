// Standalone Groq / OpenRouter key + route diagnostic — no app, no SDK.
// These providers are OpenAI-compatible, so we hit /chat/completions directly.
//
// Usage:
//   node scripts/test-openai-compatible.js groq        gsk_xxx
//   node scripts/test-openai-compatible.js openrouter  sk-or-v1-xxx
//
// Verifies: (1) the key authenticates, (2) a non-stream chat works,
// (3) a streamed chat works. Run this after pasting your key in the app to
// confirm the live round-trip the in-app smoke test cannot reach.

const provider = (process.argv[2] || '').toLowerCase();
const key = process.argv[3];

const CONFIG = {
  groq: {
    base: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'qwen/qwen3.6-27b'],
    headers: {},
  },
  openrouter: {
    base: 'https://openrouter.ai/api/v1',
    models: ['deepseek/deepseek-v4-flash', 'mistralai/mistral-medium-3.5'],
    headers: { 'HTTP-Referer': 'https://invisiq.app', 'X-Title': 'InvisiQ' },
  },
};

if (!CONFIG[provider] || !key) {
  console.error('Usage: node scripts/test-openai-compatible.js <groq|openrouter> <API_KEY>');
  process.exit(1);
}

const { base, models, headers } = CONFIG[provider];
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...headers };

async function listModels() {
  const res = await fetch(`${base}/models`, { headers: authHeaders });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log(`\n[GET /models] HTTP ${res.status}:`, JSON.stringify(json, null, 2).slice(0, 400));
    return;
  }
  const ids = (json.data || []).map((m) => m.id);
  console.log(`\n[GET /models] key OK — ${ids.length} models available. Checking our configured slugs:`);
  for (const m of models) {
    console.log(`  ${ids.includes(m) ? '✓ available' : '✗ NOT in catalog'} : ${m}`);
  }
}

async function tryChat(model) {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: pong' }],
      max_tokens: 8,
    }),
  });
  const body = await res.json().catch(() => ({}));
  const text = body?.choices?.[0]?.message?.content;
  console.log(`[chat ${model}] HTTP ${res.status} ${res.ok ? 'OK → ' + JSON.stringify(text) : '✗ ' + (body?.error?.message || '').slice(0, 100)}`);
}

async function tryStream(model) {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Count: 1 2 3' }],
      max_tokens: 16,
      stream: true,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.log(`[stream ${model}] HTTP ${res.status} ✗ ${(body?.error?.message || '').slice(0, 100)}`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let chunks = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    chunks += (text.match(/data:/g) || []).length;
  }
  console.log(`[stream ${model}] HTTP 200 OK — received ${chunks} SSE event(s)`);
}

(async () => {
  console.log(`\n=== Testing ${provider} @ ${base} ===`);
  await listModels();
  console.log('\n[non-stream chat]');
  for (const m of models) await tryChat(m);
  console.log('\n[streaming chat]');
  for (const m of models) await tryStream(m);
  console.log('\nDone.\n');
})();
