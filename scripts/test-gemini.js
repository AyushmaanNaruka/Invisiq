// Standalone Gemini key/route diagnostic — no app, no SDK.
// Usage:  node scripts/test-gemini.js YOUR_GEMINI_API_KEY
// Hits ListModels (truth source) then tries generateContent on v1beta + v1.

const key = process.argv[2];
if (!key) {
  console.error('Usage: node scripts/test-gemini.js <API_KEY>');
  process.exit(1);
}

const MODELS_TO_TRY = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    console.log(`\n[ListModels] HTTP ${res.status}:`, JSON.stringify(json, null, 2));
    return;
  }
  console.log('\n[ListModels] Models that support generateContent for THIS key:');
  for (const m of json.models || []) {
    if ((m.supportedGenerationMethods || []).includes('generateContent')) {
      console.log('  -', m.name.replace('models/', ''));
    }
  }
}

async function tryGenerate(version, model) {
  const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
  });
  const body = await res.json().catch(() => ({}));
  const ok = res.ok;
  console.log(`[${version}/${model}] HTTP ${res.status} ${ok ? 'OK' : '✗ ' + (body?.error?.message || '').slice(0, 80)}`);
}

(async () => {
  await listModels();
  console.log('\n[generateContent attempts]');
  for (const v of ['v1beta', 'v1']) {
    for (const m of MODELS_TO_TRY) {
      await tryGenerate(v, m);
    }
  }
})();
