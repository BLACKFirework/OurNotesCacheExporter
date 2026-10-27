import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const code = stripTypeScriptTypes(readFileSync(new URL('./inventory.ts', import.meta.url), 'utf8')).replace('export {};', '');
type Reply = 'network' | 'pending' | { status?: number; product?: string; body?: unknown; pendingBody?: boolean };

async function render(hash: string, origin = '', replies: Reply[] = [{}], controller: typeof AbortController | null = AbortController, initialRank = '') {
  const status = { textContent: '' };
  const pillText = { textContent: '' };
  const dot = { className: '' };
  const pill = { dataset: {} as Record<string, string>, querySelector: (selector: string) => selector === '.dot' ? dot : pillText };
  const attributes = new Map<string,string>();
  const next = { hidden: true, href: '', removeAttribute(name: string) { attributes.delete(name); if (name === 'href') this.href = ''; }, setAttribute(name: string, value: string) { attributes.set(name,value); } };
  const tgw = { value: initialRank, oninput: undefined as undefined | (() => void) };
  const tgwStatus = { textContent: '' };
  const retry = { hidden: true, disabled: false, onclick: undefined as undefined | (() => void) };
  const calls: Array<{ url: string; options: RequestInit }> = [];
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let timerId = 0;
  let replaced = '';
  const settle = () => new Promise<void>(resolve => setImmediate(resolve));
  runInNewContext(code, {
    __API_ORIGIN__: origin, URL, URLSearchParams, AbortController: controller ?? undefined,
    // No AbortSignal.timeout in this WebView; fallback must still work.
    AbortSignal: {},
    setTimeout: (callback: () => void, delay: number) => {
      const id = ++timerId;
      timers.set(id, { callback, delay });
      if (delay === 500) queueMicrotask(() => { if (timers.delete(id)) callback(); });
      return id;
    },
    clearTimeout: (id: number) => timers.delete(id),
    fetch: async (url: string, options: RequestInit) => {
      calls.push({ url, options });
      const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
      if (reply === 'network') throw Error('offline');
      if (reply === 'pending') return new Promise(() => {});
      const httpStatus = reply.status ?? 200;
      return {
        ok: httpStatus >= 200 && httpStatus < 300, status: httpStatus,
        json: async () => reply.pendingBody ? new Promise(() => {}) :
          ('body' in reply ? reply.body : { status: 'ok', service: 'ournotes-binding', product: reply.product }),
      };
    },
    location: { hash, pathname: '/OurNotesCacheExporter/', search: '' },
    history: { replaceState: (_a: unknown, _b: unknown, url: string) => { replaced = url; } },
    document: { querySelector: (selector: string) => selector === '#binding-status' ? status : selector === '#binding-pill' ? pill : selector === '#binding-retry' ? retry : selector === '#binding-tgw-rank' ? tgw : selector === '#binding-tgw-status' ? tgwStatus : next },
  });
  await settle();
  return {
    status, pill, pillText, next, retry, replaced, calls, timers, settle, tgw, tgwStatus, attributes,
    async timeout() {
      const timer = [...timers.values()].find(timer => timer.delay === 10000);
      assert.ok(timer, 'a health timeout is pending');
      timer.callback();
      await settle();
    },
  };
}

const hash = `#bind=${'a'.repeat(43)}`;
const origin = 'https://backend.example';

test('cover hands off directly with no T.G.W form or rank gate', async () => {
  const result = await render(hash, origin);
  assert.equal(result.next.href, `${origin}/${hash}`);
  assert.equal(result.next.hidden, false);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="binding-tgw-/);
});

test('unconfigured backend never shows a working login link', async () => {
  const result = await render(hash);
  assert.match(result.status.textContent, /尚未配置/);
  assert.equal(result.pill.dataset.state, 'offline');
  assert.equal(result.next.hidden, true);
  assert.equal(result.retry.hidden, true);
  assert.equal(result.replaced, '/OurNotesCacheExporter/');
  assert.equal(result.calls.length, 0);
});

test('fixed HTTPS handoff; health checks omit keys, credentials and fragment overrides', async () => {
  const result = await render(`${hash}&api=https://evil.invalid`, origin);
  assert.equal(result.next.href, `${origin}/${hash}`);
  assert.equal(result.next.hidden, false);
  assert.equal(result.pill.dataset.state, 'ready');
  assert.doesNotMatch(result.status.textContent, /backend\.example/);
  assert.equal(result.calls[0].url, `${origin}/healthz`);
  assert.equal(result.calls[0].options.credentials, 'omit');
  assert.equal(result.calls[0].options.body, undefined);
  assert.equal(result.replaced, '/OurNotesCacheExporter/');
  assert.equal(result.timers.size, 0);
});

test('invalid key and completion cannot claim verified identity', async () => {
  const invalid = await render('#bind=bad');
  assert.match(invalid.status.textContent, /无效/);
  assert.equal(invalid.pill.dataset.state, 'invalid');
  assert.equal(invalid.calls.length, 0);
  const complete = await render('#complete');
  assert.match(complete.status.textContent, /两个独立状态/);
  assert.equal(complete.pill.dataset.state, 'complete');
});

test('public HTML has no password or email form and has a manual recheck', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /type=["'](?:password|email)["']/);
  assert.doesNotMatch(code, /localStorage|sessionStorage/);
  assert.match(html, /id="binding-retry" hidden>重新检查/);
});

test('one transient network failure recovers automatically without showing offline', async () => {
  const result = await render(hash, origin, ['network', {}]);
  assert.equal(result.calls.length, 2);
  assert.equal(result.pill.dataset.state, 'ready');
  assert.equal(result.next.hidden, false);
  assert.equal(result.retry.hidden, true);
  assert.equal(result.timers.size, 0);
});

test('two network failures show connection uncertainty and allow retry on the same page', async () => {
  const result = await render(hash, origin, ['network', 'network', {}]);
  assert.equal(result.calls.length, 2);
  assert.equal(result.next.hidden, true);
  assert.equal(result.pillText.textContent, '未能连接');
  assert.match(result.status.textContent, /无法确认后端状态/);
  assert.equal(result.retry.hidden, false);
  assert.equal(result.retry.disabled, false);
  result.retry.onclick!();
  await result.settle();
  assert.equal(result.calls.length, 3);
  assert.equal(result.pill.dataset.state, 'ready');
  assert.equal(result.next.href, `${origin}/${hash}`);
  assert.equal(result.next.hidden, false);
});

test('transient server failures retry once; permanent failures report their HTTP status', async () => {
  const recovered = await render(hash, origin, [{ status: 503 }, {}]);
  assert.equal(recovered.calls.length, 2);
  assert.equal(recovered.pill.dataset.state, 'ready');
  const refused = await render(hash, origin, [{ status: 403 }]);
  assert.equal(refused.calls.length, 1);
  assert.equal(refused.next.hidden, true);
  assert.match(refused.status.textContent, /HTTP 403/);
});

test('incompatible products and malformed health data never enable handoff', async () => {
  for (const reply of [{ product: 'OtherBot' }, { body: null }, { body: {} }]) {
    const result = await render(hash, origin, [reply]);
    assert.equal(result.calls.length, 1);
    assert.equal(result.next.hidden, true);
    assert.equal(result.pillText.textContent, '服务响应异常');
  }
});

test('health check works without AbortController or AbortSignal.timeout', async () => {
  const result = await render(hash, origin, [{}], null);
  assert.equal(result.pill.dataset.state, 'ready');
  assert.equal(result.next.hidden, false);
});

test('hung fetch is bounded and duplicate manual checks cannot overlap', async () => {
  const result = await render(hash, origin, ['pending']);
  assert.equal(result.retry.disabled, true);
  result.retry.onclick!();
  assert.equal(result.calls.length, 1);
  await result.timeout();
  assert.equal(result.calls.length, 2);
  await result.timeout();
  assert.equal(result.pillText.textContent, '未能连接');
  assert.match(result.status.textContent, /连接超时/);
  assert.equal(result.next.hidden, true);
  assert.equal(result.retry.disabled, false);
  assert.equal(result.timers.size, 0);
});

test('timeout also bounds a response whose JSON body never completes', async () => {
  const result = await render(hash, origin, [{ pendingBody: true }, {}]);
  await result.timeout();
  assert.equal(result.calls.length, 2);
  assert.equal(result.pill.dataset.state, 'ready');
  assert.equal(result.timers.size, 0);
});
