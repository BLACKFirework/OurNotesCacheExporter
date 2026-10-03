export const BASE='/sdcard/Android/data/com.bilibili.sirius.official/files';
export const LIMIT=16*1024*1024;
export const hex=(s:string)=>/^[a-fA-F0-9]{32,64}$/.test(s);
export function pathCheck(p:string){if(!new RegExp('^'+'/sdcard/Android/data/com\\.bilibili\\.sirius(?:\\.official)?/files'+'/[a-fA-F0-9]{32,64}/[a-fA-F0-9]{32,64}$').test(p))throw Error('invalid_path');return p;}
export interface Meta {size:number;mtime:string}
export interface Source {list(p:string):Promise<string[]>;stat(p:string):Promise<Meta>;header(p:string):Promise<Uint8Array>;hash(p:string):Promise<string>;read(p:string):Promise<Uint8Array>}
export async function discover(s:Source,base=BASE){
 const dirs=await s.list(base);if(dirs.length>128)throw Error('discovery_limit');
 const accounts=dirs.filter(hex);if(!accounts.length)throw Error('no_cache');if(accounts.length!==1)throw Error('ambiguous_accounts');
 const root=base+'/'+accounts[0],names=await s.list(root);if(names.length>24)throw Error('discovery_limit');
 const found=[];
 for(const name of names.filter(hex)){const path=pathCheck(root+'/'+name),m=await s.stat(path);if(m.size<96||m.size>LIMIT||(m.size-64)%32)continue;
  const h=await s.header(path);if(h.length!==64)throw Error('short_header');found.push({path,...m});}
 if(!found.length)throw Error('no_cache');return found;
}
export async function sha(b:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(b)))).map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function stable(s:Source,path:string){pathCheck(path);
 for(let i=0;i<3;i++){const before=await s.stat(path);if(before.size<96||before.size>LIMIT)throw Error('size_limit');
  const h=await s.hash(path),b=await s.read(path),after=await s.stat(path),end=await s.hash(path);
  if(b.length===before.size&&before.size===after.size&&before.mtime===after.mtime&&h===end&&await sha(b)===h)return {bytes:b,sha256:h,...after};
 }throw Error('unstable');
}
export function support(secure:boolean,usb:boolean){if(!secure)throw Error('insecure');if(!usb)throw Error('unsupported');}
export async function bounded<T>(p:Promise<T>,ms:number,cleanup:()=>void){let t:ReturnType<typeof setTimeout>;try{return await Promise.race([p,new Promise<T>((_,reject)=>{t=setTimeout(()=>{cleanup();reject(Error('timeout'));},ms);})]);}finally{clearTimeout(t!);}}
export function reason(e:unknown){const s=e instanceof Error?e.name+' '+e.message:String(e);if(/SecurityError|permissions policy|disallowed by permissions/i.test(s))return 'browser_policy';if(/NotAllowedError|user gesture/i.test(s))return 'usb_permission';if(/permission denied/i.test(s))return 'permission_denied';if(/no such file/i.test(s))return 'missing_directory';if(/notfound|cancel/i.test(s))return 'cancelled';if(/busy|claim|access denied|already in use|already in used/i.test(s))return 'usb_busy';if(/disconnect|networkerror/i.test(s))return 'disconnected';return ['insecure','unsupported','timeout','unstable','size_limit','no_cache','ambiguous_accounts','package_absent','shell_unsupported','discovery_limit','short_header'].includes(e instanceof Error?e.message:String(e))?(e instanceof Error?e.message:String(e)):'usb_or_auth_failed';}

