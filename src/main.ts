import './style.css';
import {inspectFile, type FileInfo} from './file-info';
type Provenance={platform:'android'|'ios'|'unknown';transport:'file_picker'|'webusb';exported_at:string|null;game_version:string|null};
import {Adb,AdbDaemonTransport,type AdbPrivateKey} from '@yume-chan/adb';
import {AdbDaemonWebUsbDeviceManager,type AdbDaemonWebUsbDevice} from '@yume-chan/adb-daemon-webusb';
import {BASE,LIMIT,bounded,discover,stable,support,reason,type Source} from './core';
// Ephemeral credential store; key generation matches Tango's MIT credential-web implementation.
class MemoryCredentials {
 key?:AdbPrivateKey;
 async generateKey(){const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-1'},true,['sign','verify']);return this.key={buffer:new Uint8Array(await crypto.subtle.exportKey('pkcs8',pair.privateKey)),name:'OurNotes-cache@local'};}
 async *iterateKeys(){if(this.key)yield this.key;}
 clear(){this.key?.buffer.fill(0);this.key=undefined;}
}
const keys=new MemoryCredentials();let adb:Adb|undefined,device:AdbDaemonWebUsbDevice|undefined;let choices:Awaited<ReturnType<typeof discover>>=[];let busy=false;let generation=0;let stage="准备";
const status=document.querySelector('#status')!;const select=document.querySelector<HTMLSelectElement>('#candidate')!;
const packageSelect=document.querySelector<HTMLSelectElement>('#package')!;
let latest: {file:Blob;source:Provenance}|undefined;
let gameVersion:string|null=null;
const packageName=()=>packageSelect.value==='com.bilibili.sirius'?'com.bilibili.sirius':'com.bilibili.sirius.official';
const basePath=()=>'/sdcard/Android/data/'+packageName()+'/files';
packageSelect.onchange=()=>{choices=[];select.replaceChildren();};
const btn=(id:string)=>document.querySelector<HTMLButtonElement>('#'+id)!;
function message(s:string){status.textContent=s;}
async function close(){document.querySelector('#connection-state')!.textContent='未连接';generation++;const old=adb;adb=undefined;choices=[];select.replaceChildren();try{await old?.close();}finally{await device?.raw.close().catch(()=>{});device=undefined;}}
async function bytes(stream:{getReader():{read():Promise<{done:boolean;value?:Uint8Array}>;cancel():Promise<unknown>;releaseLock():void}},limit:number){const reader=stream.getReader();const parts:Uint8Array[]=[];let size=0;try{while(true){const v=await reader.read();if(v.done)break;size+=v.value!.length;if(size>limit)throw Error('size_limit');parts.push(v.value!);}const b=new Uint8Array(size);let i=0;for(const p of parts){b.set(p,i);i+=p.length;}return b;}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}}
async function shell(command:string[],limit=65536){const svc=adb?.subprocess.shellProtocol;if(!svc)throw Error('shell_unsupported');
 const proc=await svc.spawn(command);
 try{const [stdout,stderr,code]=await Promise.all([bytes(proc.stdout,limit),bytes(proc.stderr,4096),proc.exited]);if(code)throw Error(new TextDecoder().decode(stderr));return stdout;}finally{await proc.kill();}}
function source():Source {return {
 async list(p){const sync=await adb!.sync();try{const names=[];for await(const entry of sync.opendir(p)){names.push(entry.name);if(names.length>128)throw Error('discovery_limit');}return names;}finally{await sync.dispose();}},
 async stat(p){const sync=await adb!.sync();try{const m=await sync.lstat(p);if(m.type!==8)throw Error('size_limit');return {size:Number(m.size),mtime:String(m.mtime)};}finally{await sync.dispose();}},
 header:p=>shell(['head','-c','64',p],64),
 async hash(p){const v=new TextDecoder().decode(await shell(['sha256sum',p])).split(/\s+/)[0];if(!/^[0-9a-f]{64}$/.test(v))throw Error('hash_failed');return v;},
 async read(p){const sync=await adb!.sync();try{return await bytes(sync.read(p),LIMIT);}finally{await sync.dispose();}}
 };}
const labels:Record<string,string>={browser_policy:'浏览器安全策略阻止 USB。请将地址复制到独立的桌面 Chrome/Edge 窗口，不要使用内嵌网页。',usb_permission:'浏览器未授予 USB 权限。请在独立 Chrome/Edge 中点击连接并选择手机。',insecure:'请使用 localhost 或 HTTPS。',unsupported:'请使用支持 WebUSB 的桌面 Chrome/Edge。',cancelled:'已取消选择设备。',usb_busy:'USB 接口被占用或驱动不兼容。请检查其他 ADB 工具；本页不会停止共享 ADB 或修改驱动。',timeout:'操作超时，已关闭本页连接。请确认手机授权或连接状态。',permission_denied:'目标目录或读取通路被拒绝。请保留 CLI 探针结果；网页不能保证绕过权限。',missing_directory:'目标目录不存在。请确认支持的游戏版本已正常登录。',no_cache:'没有符合大小/路径条件的缓存。',ambiguous_accounts:'发现多个账号目录，请交由维护者明确选择；未自动取包。',package_absent:'未找到受支持的游戏包。',disconnected:'手机已断开，请重新连接。',unstable:'三次读取均遇到内容变化，未导出。',usb_or_auth_failed:'USB/ADB 操作失败。请检查连接、手机授权及 CLI 对照结果。'};
async function action(fn:()=>Promise<void>,ms=30000){if(busy)return;busy=true;document.querySelectorAll<HTMLButtonElement>('button:not(#disconnect)').forEach(b=>b.disabled=true);try{await bounded(fn(),ms,()=>{void close();});}catch(e){const failedStage=stage;await close().catch(()=>{});message(`失败阶段：${failedStage}\n${labels[reason(e)]??reason(e)}\n诊断代码：${reason(e)}`);}finally{busy=false;document.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=false);}}
btn('connect').onclick=()=>{void action(async()=>{
 stage='浏览器支持检查';support(isSecureContext,!!AdbDaemonWebUsbDeviceManager.BROWSER);await close();message('选择手机并在手机上确认 USB 调试授权…');
 stage='USB 设备选择';const attempt=generation;device=await AdbDaemonWebUsbDeviceManager.BROWSER!.requestDevice();if(!device)throw Error('cancelled');
 if(attempt!==generation){await device?.raw.close();throw Error('cancelled');}stage='打开 USB / 占用 ADB 接口';const connection=await device.connect();stage='手机 ADB 认证';const transport=await AdbDaemonTransport.authenticate({serial:'local-device',connection,credentialStore:keys,readTimeLimit:10000});if(attempt!==generation){await transport.close();throw Error('cancelled');}adb=new Adb(transport);void adb.disconnected.then(()=>{document.querySelector('#connection-state')!.textContent='未连接';message('连接已断开。');},()=>{document.querySelector('#connection-state')!.textContent='未连接';message('连接中断。');});
 message('已连接。下一步：检查游戏缓存访问，并选择要导出的文件。');
 document.querySelector('#connection-state')!.textContent='已连接';
 },60000);};
btn('check').onclick=()=>{void action(async()=>{stage='缓存访问检查';if(!adb)throw Error('disconnected');const pkg=new TextDecoder().decode(await shell(['dumpsys','package',packageName()]));if(!/versionName=/.test(pkg))throw Error('package_absent');gameVersion=pkg.match(/versionName=(\S+)/)?.[1]??null;
 const uid=new TextDecoder().decode(await shell(['id','-u'])).trim(),android=new TextDecoder().decode(await shell(['getprop','ro.build.version.release'])).trim();
 choices=await discover(source(),basePath());select.replaceChildren(new Option('请选择候选（未解密验证）',''));choices.forEach((c,i)=>select.add(new Option(`候选 ${i+1} · ${c.size} bytes`,String(i))));message(`目录可读；shell uid ${uid} / Android ${android}。找到 ${choices.length} 个候选，需明确选择。无私有 magic，不能判定哪份是卡库。`);
 });};
btn('export').onclick=()=>{void action(async()=>{stage='缓存稳定导出';if(!adb||select.value==='')throw Error('no_cache');const chosen=choices[Number(select.value)];if(!chosen)throw Error('no_cache');const current=await discover(source(),basePath());if(!current.some(c=>c.path===chosen.path))throw Error('no_cache');
 const attempt=generation;const result=await stable(source(),chosen.path);if(attempt!==generation)throw Error('cancelled');const exported_at=new Date().toISOString();latest={file:new Blob([new Uint8Array(result.bytes)],{type:'application/octet-stream'}),source:{platform:'android',transport:'webusb',exported_at,game_version:gameVersion}};const url=URL.createObjectURL(latest.file);const a=document.createElement('a');a.href=url;a.download='ournotes-cache.bin';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message(`已导出 ${result.size} bytes（ADB sync）。导出时间 ${exported_at}。SHA-256 ${result.sha256}。可点击“检查刚导出的文件”查看文件信息；卡库解码尚未接入。文件未上传。`);
 },60000);};
btn('disconnect').onclick=()=>{void close().then(()=>{message('已断开本页连接。');document.querySelector('#connection-state')!.textContent='未连接';});};
btn('clear').onclick=()=>{void close().then(()=>{keys.clear();message('已清除此页面内存中的 ADB 密钥。手机端既有授权不会由本页撤销。');});};
window.addEventListener('pagehide',()=>{keys.clear();void close();});


const fileStatus=document.querySelector('#file-status')!;
let fileBusy=false;
async function showFileInfo(file:Blob,source:Provenance,name:string){
 if(fileBusy)return;fileBusy=true;fileStatus.textContent='正在检查文件…';
 try{
  const info:FileInfo=await inspectFile(file,name);
  fileStatus.textContent=[
   '文件信息已读取',
   `文件：${info.name}`,
   `大小：${info.size.toLocaleString('en-US')} bytes`,
   `SHA-256：${info.sha256}`,
   `来源：${source.platform==='android'?'安卓':source.platform==='ios'?'iOS / iPadOS':'未知'}`,
   `导出时间：${source.exported_at??'未知'}`,
   '文件没有上传。此页面不解密缓存，也不能据此确认账号或卡库完整性。'
  ].join('\n');
 }catch(e){fileStatus.textContent=e instanceof Error?e.message:'文件检查失败';}
 finally{fileBusy=false;}
}
btn('inspect-export').onclick=()=>{if(latest)void showFileInfo(latest.file,latest.source,'ournotes-cache.bin');else fileStatus.textContent='请先导出缓存。';};
btn('inspect-file').onclick=()=>{const file=document.querySelector<HTMLInputElement>('#cache-file')!.files?.[0];if(!file){fileStatus.textContent='请先选择文件。';return;}
 const value=document.querySelector<HTMLSelectElement>('#platform')!.value;
 void showFileInfo(file,{platform:value==='android'?'android':value==='ios'?'ios':'unknown',transport:'file_picker',exported_at:null,game_version:null},file.name);
};
if(!isSecureContext||!AdbDaemonWebUsbDeviceManager.BROWSER){
 const note=document.querySelector('#browser-note')!;
 note.textContent='USB 导出需要电脑上的独立 Chrome 或 Edge，以及 HTTPS。此浏览器可查看教程和检查已有文件。';
 note.classList.add('visible');
 for(const id of ['connect','check','export'])btn(id).disabled=true;
}
