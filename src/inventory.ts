declare const __API_ORIGIN__: string;

type BindingState = 'idle' | 'checking' | 'ready' | 'invalid' | 'offline' | 'complete';
const status = document.querySelector<HTMLElement>('#binding-status')!;
const pill = document.querySelector<HTMLElement>('#binding-pill')!;
const pillText = pill.querySelector<HTMLElement>('span:last-child')!;
const dot = pill.querySelector<HTMLElement>('.dot')!;
const next = document.querySelector<HTMLAnchorElement>('#binding-continue')!;
const retry = document.querySelector<HTMLButtonElement>('#binding-retry')!;
const tgwRank = document.querySelector<HTMLInputElement>('#binding-tgw-rank');
const tgwStatus = document.querySelector<HTMLElement>('#binding-tgw-status');
let checking = false;

function setState(state: BindingState, message: string, label: string): void {
  pill.dataset.state = state;
  pillText.textContent = label;
  dot.className = state === 'idle' ? 'dot gray' : 'dot';
  status.textContent = message;
}

class HealthError extends Error {
  kind: 'network' | 'timeout' | 'http' | 'incompatible';
  httpStatus: number;
  constructor(kind: HealthError['kind'], httpStatus = 0) {
    super(kind);
    this.kind = kind;
    this.httpStatus = httpStatus;
  }
}

async function health(origin: string): Promise<void> {
  // Some QQ WebViews support fetch but do not support AbortSignal.timeout.
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      (async () => {
        let response: Response;
        try {
          response = await fetch(`${origin}/healthz`, {
            mode: 'cors', cache: 'no-store', credentials: 'omit', signal: controller?.signal,
          });
        } catch { throw new HealthError('network'); }
        if (!response.ok) throw new HealthError('http', response.status);
        let data: { status?: string; service?: string; product?: string } | null;
        try { data = await response.json(); } catch { throw new HealthError('incompatible'); }
        if (!data || data.status !== 'ok' || data.service !== 'ournotes-binding' ||
            (data.product !== undefined && data.product !== 'ShizukuBot')) {
          throw new HealthError('incompatible');
        }
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new HealthError('timeout'));
          controller?.abort();
        }, 10000);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

async function check(origin: string): Promise<void> {
  if (checking) return;
  checking = true;
  next.hidden = true;
  retry.hidden = false;
  retry.disabled = true;
  setState('checking', '正在检查 ShizukuBot 绑定服务。健康检查不会携带临时 key、Cookie 或账号资料。', '检查服务');
  try {
    for (let attempt = 0; ; attempt++) {
      try { await health(origin); break; }
      catch (error) {
        const temporary = error instanceof HealthError &&
          (error.kind === 'network' || error.kind === 'timeout' ||
           (error.kind === 'http' && (error.httpStatus >= 500 || error.httpStatus === 429)));
        if (attempt !== 0 || !temporary) throw error;
        setState('checking', '首次检查未能连接，正在重试。请稍候。', '正在重试');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    next.hidden = false;
    retry.hidden = true;
    setState('ready', '服务在线。进入后请先核对目标 QQ，再选择来源、检查预览并明确确认。ShizukuBot 是非官方玩家工具。', '可以继续');
  } catch (error) {
    if (error instanceof HealthError && error.kind === 'incompatible') {
      setState('offline', '绑定服务返回的内容异常，暂不能进入。请稍后重新检查；仍失败时联系维护者。', '服务响应异常');
    } else if (error instanceof HealthError && error.kind === 'http') {
      setState('offline', `绑定服务暂不可用（HTTP ${error.httpStatus}）。请稍后重新检查；链接超过十分钟时回 QQ 重新发送 on绑定。`, '服务暂不可用');
    } else {
      const detail = error instanceof HealthError && error.kind === 'timeout' ? '连接超时' : '网络连接失败';
      setState('offline', `${detail}，暂时无法确认后端状态。请点击“重新检查”；在 QQ 内打开时，也可将机器人原链接复制到系统浏览器。链接超过十分钟时回 QQ 重新发送 on绑定。`, '未能连接');
    }
  } finally {
    checking = false;
    retry.disabled = false;
  }
}

const fragment = location.hash;
let key = new URLSearchParams(fragment.slice(1)).get('bind');

if (fragment === '#complete') {
  setState('complete', '已返回 ShizukuBot 工具首页。绑定结果与 QQ 通知是两个独立状态；可在 QQ 发送 onmyinfo 查询当前绑定。', '已返回');
}

if (key) {
  // Remove the one-time key before any browser API or network operation can fail.
  history.replaceState(null, '', location.pathname + location.search);
  if (!/^[A-Za-z0-9_-]{43}$/.test(key)) {
    setState('invalid', '绑定链接无效、已损坏或格式不完整。请回 QQ 私聊 ShizukuBot 重新发送 on绑定。', '链接无效');
  } else if (!__API_ORIGIN__) {
    setState('offline', '公开绑定后端尚未配置，当前不能在线绑定。请稍后从 QQ 获取新链接；下方安卓导出工具仍可独立使用。', '服务未配置');
  } else {
    const backend = new URL(__API_ORIGIN__);
    if (backend.protocol !== 'https:') throw Error('HTTPS backend required');
    const ticket = key;
    const updateLink = (): void => {
      const rank = tgwRank?.value.trim() || '';
      if (rank && !/^(?:[1-9]|1[0-9]|2[01])$/.test(rank)) {
        next.removeAttribute('href');
        next.setAttribute('aria-disabled', 'true');
        if (tgwStatus) tgwStatus.textContent = '请填写 1～21 的整数等级，或留空后在导入页填写。';
        return;
      }
      const params = new URLSearchParams({ bind: ticket });
      if (rank) params.set('tgw', rank);
      next.href = `${backend.origin}/#${params}`;
      next.removeAttribute('aria-disabled');
      if (tgwStatus) tgwStatus.textContent = rank ? `已填写 T.G.W ${rank} 级，进入读取页时会自动带入。` : '';
    };
    if (tgwRank) tgwRank.oninput = updateLink;
    updateLink();
    retry.onclick = () => { void check(backend.origin); };
    void check(backend.origin);
  }
  // The one-time key is removed from the public Pages URL and is never sent in health checks.
  key = null;
}

export {};
