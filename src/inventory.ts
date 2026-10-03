declare const __API_ORIGIN__:string;
const status=document.querySelector<HTMLElement>('#binding-status')!;
const next=document.querySelector<HTMLAnchorElement>('#binding-continue')!;
let key=new URLSearchParams(location.hash.slice(1)).get('bind');
if(location.hash==='#complete')status.textContent='已返回工具首页。绑定和 QQ 通知状态请以独立后端结果为准；在 QQ 发送 onmyinfo 查看。';
if(key){
 if(!/^[A-Za-z0-9_-]{43}$/.test(key)){status.textContent='绑定链接无效，请回 QQ 重新发送 on绑定。';}
 else if(!__API_ORIGIN__){status.textContent='绑定后端尚未配置，当前不能在线绑定。请联系维护者；下方导出工具仍可使用。';}
 else{const backend=new URL(__API_ORIGIN__);if(backend.protocol!=='https:')throw Error('HTTPS backend required');next.href=backend.origin+'/#bind='+encodeURIComponent(key);next.hidden=false;status.textContent='继续后将在独立后端核对目标 QQ、有效期和请求状态，再读取与确认卡库。';}
 history.replaceState(null,'',location.pathname+location.search);key=null;
}
export {};
