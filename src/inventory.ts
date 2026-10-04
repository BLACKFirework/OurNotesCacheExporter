declare const __API_ORIGIN__: string;

type BindingState = 'idle' | 'checking' | 'ready' | 'invalid' | 'offline' | 'complete';
const status = document.querySelector<HTMLElement>('#binding-status')!;
const pill = document.querySelector<HTMLElement>('#binding-pill')!;
const pillText = pill.querySelector<HTMLElement>('span:last-child')!;
const dot = pill.querySelector<HTMLElement>('.dot')!;
const next = document.querySelector<HTMLAnchorElement>('#binding-continue')!;

function setState(state: BindingState, message: string, label: string): void {
  pill.dataset.state = state;
  pillText.textContent = label;
  dot.className = state === 'idle' ? 'dot gray' : 'dot';
  status.textContent = message;
}

const fragment = location.hash;
let key = new URLSearchParams(fragment.slice(1)).get('bind');

if (fragment === '#complete') {
  setState('complete', '已返回 ShizukuBot 工具首页。绑定结果与 QQ 通知是两个独立状态；可在 QQ 发送 onmyinfo 查询当前绑定。', '已返回');
}

if (key) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(key)) {
    setState('invalid', '绑定链接无效、已损坏或格式不完整。请回 QQ 私聊 ShizukuBot 重新发送 on绑定。', '链接无效');
  } else if (!__API_ORIGIN__) {
    setState('offline', '公开绑定后端尚未配置，当前不能在线绑定。请稍后从 QQ 获取新链接；下方安卓导出工具仍可独立使用。', '服务未配置');
  } else {
    const backend = new URL(__API_ORIGIN__);
    if (backend.protocol !== 'https:') throw Error('HTTPS backend required');
    next.href = `${backend.origin}/#bind=${encodeURIComponent(key)}`;
    setState('checking', '正在检查 ShizukuBot 绑定服务。健康检查不会携带临时 key、Cookie 或账号资料。', '检查服务');
    fetch(`${backend.origin}/healthz`, {
      mode: 'cors', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000),
    }).then(async response => {
      const data = await response.json();
      const compatibleProduct = data.product === undefined || data.product === 'ShizukuBot';
      if (!response.ok || data.status !== 'ok' || data.service !== 'ournotes-binding' || !compatibleProduct) throw Error('offline');
      next.hidden = false;
      setState('ready', '服务在线。进入后请先核对目标 QQ，再选择来源、检查预览并明确确认。ShizukuBot 是非官方玩家工具。', '可以继续');
    }).catch(() => {
      next.hidden = true;
      setState('offline', '绑定服务暂不可用。临时隧道可能已变化或维护者电脑不在线；请稍后从 QQ 重新获取链接。', '后端离线');
    });
  }
  // The one-time key is removed from the public Pages URL and is never sent in health checks.
  history.replaceState(null, '', location.pathname + location.search);
  key = null;
}

export {};
