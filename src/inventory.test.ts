import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const code = stripTypeScriptTypes(readFileSync(new URL('./inventory.ts', import.meta.url), 'utf8')).replace('export {};', '');

async function render(hash: string, origin = '', offline = false, product: string | undefined = 'ShizukuBot') {
  const status = { textContent: '' };
  const pillText = { textContent: '' };
  const dot = { className: '' };
  const pill = { dataset: {} as Record<string, string>, querySelector: (selector: string) => selector === '.dot' ? dot : pillText };
  const next = { hidden: true, href: '' };
  let replaced = '';
  runInNewContext(code, {
    __API_ORIGIN__: origin, URL, URLSearchParams, AbortSignal,
    fetch: async () => {
      if (offline) throw Error('offline');
      return { ok: true, json: async () => ({ status: 'ok', service: 'ournotes-binding', product }) };
    },
    location: { hash, pathname: '/OurNotesCacheExporter/', search: '' },
    history: { replaceState: (_a: unknown, _b: unknown, url: string) => { replaced = url; } },
    document: { querySelector: (selector: string) => selector === '#binding-status' ? status : selector === '#binding-pill' ? pill : next },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { status, pill, pillText, next, replaced };
}

test('unconfigured backend never shows a working login link', async () => {
  const result = await render(`#bind=${'a'.repeat(43)}`);
  assert.match(result.status.textContent, /尚未配置/);
  assert.equal(result.pill.dataset.state, 'offline');
  assert.equal(result.next.hidden, true);
  assert.equal(result.replaced, '/OurNotesCacheExporter/');
});

test('fixed HTTPS origin handoff; fragment cannot override destination', async () => {
  const result = await render(`#bind=${'a'.repeat(43)}&api=https://evil.invalid`, 'https://backend.example');
  assert.equal(result.next.href, `https://backend.example/#bind=${'a'.repeat(43)}`);
  assert.equal(result.next.hidden, false);
  assert.equal(result.pill.dataset.state, 'ready');
  assert.doesNotMatch(result.status.textContent, /backend\.example/);
});

test('invalid key and completion cannot claim verified identity', async () => {
  const invalid = await render('#bind=bad');
  assert.match(invalid.status.textContent, /无效/);
  assert.equal(invalid.pill.dataset.state, 'invalid');
  const complete = await render('#complete');
  assert.match(complete.status.textContent, /两个独立状态/);
  assert.equal(complete.pill.dataset.state, 'complete');
});

test('public HTML has no password or email form', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /type=["'](?:password|email)["']/);
  assert.doesNotMatch(code, /localStorage|sessionStorage/);
});

test('offline or incompatible backend hides handoff', async () => {
  const offline = await render(`#bind=${'a'.repeat(43)}`, 'https://backend.example', true);
  assert.equal(offline.next.hidden, true);
  assert.match(offline.status.textContent, /暂不可用/);
  const wrongProduct = await render(`#bind=${'a'.repeat(43)}`, 'https://backend.example', false, 'OtherBot');
  assert.equal(wrongProduct.next.hidden, true);
  assert.equal(wrongProduct.pill.dataset.state, 'offline');
});
