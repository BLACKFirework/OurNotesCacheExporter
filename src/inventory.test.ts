import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const code=stripTypeScriptTypes(readFileSync(new URL('./inventory.ts',import.meta.url),'utf8')).replace('export {};','');
function render(hash:string,origin=''){
 const status={textContent:''},next={hidden:true,href:''};let replaced='';
 runInNewContext(code,{__API_ORIGIN__:origin,URL,URLSearchParams,location:{hash,pathname:'/OurNotesCacheExporter/',search:''},history:{replaceState:(_a:unknown,_b:unknown,url:string)=>{replaced=url;}},document:{querySelector:(s:string)=>s==='#binding-status'?status:next}});
 return {status,next,replaced};
}
test('unconfigured backend never shows a working login link',()=>{const r=render('#bind='+'a'.repeat(43));assert.match(r.status.textContent,/尚未配置/);assert.equal(r.next.hidden,true);assert.equal(r.replaced,'/OurNotesCacheExporter/');});
test('fixed HTTPS origin handoff; fragment cannot override destination',()=>{const r=render('#bind='+'a'.repeat(43)+'&api=https://evil.invalid','https://backend.example');assert.equal(r.next.href,'https://backend.example/#bind='+'a'.repeat(43));assert.equal(r.next.hidden,false);});
test('invalid key and completion cannot claim verified identity',()=>{assert.match(render('#bind=bad').status.textContent,/无效/);assert.match(render('#complete').status.textContent,/以独立后端结果为准/);});
test('public HTML has no password or email form',()=>{const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/type=["'](?:password|email)["']/);assert.doesNotMatch(code,/fetch\(|localStorage|sessionStorage/);});
