declare const __API_ORIGIN__:string;
const api=__API_ORIGIN__||(['127.0.0.1','localhost'].includes(location.hostname)?location.origin:'');
let bindKey=new URLSearchParams(location.hash.slice(1)).get('bind')||'';
if(bindKey)history.replaceState(null,'',location.pathname+location.search);
let token='';let pageNumber=1;let category='all';let busy=false;
const output=document.querySelector<HTMLElement>('#inventory-status')!;
const cards=document.querySelector<HTMLElement>('#inventory-cards')!;
const save=document.querySelector<HTMLButtonElement>('#inventory-save')!;
function status(text:string){output.textContent=text;}
async function request(path:string,body:BodyInit):Promise<any>{
 if(!api)throw Error('后端未配置；此静态站仍可导出文件。');
 if(!token){const r=await fetch(api+'/api/session');if(!r.ok)throw Error('无法建立网页会话，请检查后端及跨域配置。');token=(await r.json()).token;}
 const r=await fetch(api+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream'},body,signal:AbortSignal.timeout(180000)});
 const value=await r.json();if(!r.ok)throw Error(value.error??'操作失败');return value;
}
function show(value:any){
 save.disabled=bindKey?!value.can_bind:!value.can_save;save.textContent=bindKey?'确认绑定 QQ':'保存供 bot 查询';cards.replaceChildren();
 const counts=value.counts;status(`游戏 UID／profileId：${value.uid??'未知，仅预览'}\nUID 来源：${value.identity_source??'unknown'}（与游戏界面 UID 对照：${value.display_uid_match??'unknown'}）\n成员 ${counts.member??'未知'} / 留影 ${counts.support??'未知'} · ${value.page}/${value.pages} 页\n来源 ${value.source}\n采集 ${value.captured_at??'未知'} / 接收 ${value.received_at}\n完整性未验证，账号所有权未验证；未用于自动算分。`);
 if(value.profile)output.textContent+='\n昵称：'+(value.profile.name??'未知')+'\nRank EXP：'+(value.profile.rankExp??'未知')+' / Rank：'+(value.profile.projectedRank??'未知')+'\n头像成员 Master ID：'+(value.profile.favoriteMemberCardMasterId??'未知');
 for(const row of value.rows){
  const card=document.createElement('article');card.className='inventory-card';
  const art=document.createElement('div');art.className='inventory-art';art.textContent='图片暂缺';
  if(row.image){const image=document.createElement('img');image.alt=row.name;image.src=api+'/assets-public/'+row.image+'.webp';image.onload=()=>art.replaceChildren(image);}
  const name=document.createElement('h3');name.textContent=row.name;
  const raw=document.createElement('pre');raw.textContent=`${row.kind==='member'?'成员':'留影'} #${row.masterId} · 稀有度 ${row.rarity??'未知'}\n${row.character}\n`+JSON.stringify(row.values,null,2);
  card.append(art,name,raw);cards.append(card);
 }
}
async function act(fn:()=>Promise<void>){if(busy)return;busy=true;status('处理中，请稍候…');try{await fn();}catch(e){status(e instanceof Error?e.message:'网络或跨域请求失败');}finally{busy=false;}}
const button=(id:string)=>document.querySelector<HTMLButtonElement>('#'+id)!;
button('inventory-login').onclick=()=>void act(async()=>{
 const email=document.querySelector<HTMLInputElement>('#bhk-email')!;const password=document.querySelector<HTMLInputElement>('#bhk-password')!;
 const body=JSON.stringify({email:email.value,password:password.value});email.value='';password.value='';save.disabled=true;
 show(await request('/api/login',body));pageNumber=1;
});
button('inventory-import').onclick=()=>void act(async()=>{
 const file=document.querySelector<HTMLInputElement>('#inventory-file')!.files?.[0];if(!file)throw Error('请选择缓存或养成 JSON');if(file.size>16*1024*1024)throw Error('文件超过 16 MiB');save.disabled=true;
 show(await request('/api/import',file));pageNumber=1;
});
save.onclick=()=>void act(async()=>{if(bindKey){const result=await request('/api/bind',JSON.stringify({key:bindKey}));bindKey='';save.disabled=true;status('绑定完成：QQ '+result.qq+'。请在 QQ 发送 onmyinfo 或 卡库角色。');return;}const result=await request('/api/save','{}');status(`已保存展示卡库（${result.status}）。QQ 发送：\n绑定 uid ${result.uid}\n卡库一览\n此关联不验证账号所有权。`);});
button('inventory-refresh').onclick=()=>void act(async()=>{category=document.querySelector<HTMLSelectElement>('#inventory-category')!.value;pageNumber=Number(document.querySelector<HTMLInputElement>('#inventory-page')!.value);show(await request('/api/page',JSON.stringify({category,page:pageNumber})));});
button('inventory-clear').onclick=()=>void act(async()=>{await request('/api/clear','{}');token='';cards.replaceChildren();save.disabled=true;status('已清除本地网页会话；不代表官方账号已注销。');});
if(!api)status('后端未配置；登录读取、预览保存尚未上线。文件导出功能仍可使用。');
export {};
