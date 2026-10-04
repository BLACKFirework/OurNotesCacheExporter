declare const __API_ORIGIN__:string;
const status=document.querySelector<HTMLElement>('#binding-status')!;
const next=document.querySelector<HTMLAnchorElement>('#binding-continue')!;
let key=new URLSearchParams(location.hash.slice(1)).get('bind');
if(location.hash==='#complete')status.textContent='已返回工具首页。绑定和 QQ 通知状态请以独立后端结果为准；在 QQ 发送 onmyinfo 查看。';
if(key){
 if(!/^[A-Za-z0-9_-]{43}$/.test(key)){status.textContent='绑定链接无效，请回 QQ 重新发送 on绑定。';}
 else if(!__API_ORIGIN__){status.textContent='绑定后端尚未配置，当前不能在线绑定。请联系维护者；下方导出工具仍可使用。';}
 else{
  const backend=new URL(__API_ORIGIN__);if(backend.protocol!=='https:')throw Error('HTTPS backend required');
  next.href=backend.origin+'/#bind='+encodeURIComponent(key);
  status.textContent='正在检查服务：'+backend.origin;
  fetch(backend.origin+'/healthz',{mode:'cors',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)}).then(async response=>{
   const data=await response.json();if(!response.ok||data.status!=='ok'||data.service!=='ournotes-binding')throw Error('offline');
   next.hidden=false;status.textContent='服务地址：'+backend.origin+'。进入后核对目标 QQ 并读取卡库；这是 OurNotesBot 查询服务，不是官方授权登录。';
  }).catch(()=>{next.hidden=true;status.textContent='服务暂不可用，请刷新页面或稍后从 QQ 链接重试。旧页面可能仍使用上次隧道地址。';});
 }
 // The private key is only held by the handoff link, never a health request.
 history.replaceState(null,'',location.pathname+location.search);key=null;
}
export {};
