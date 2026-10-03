import assert from 'node:assert/strict';import {test} from 'node:test';
import {BASE,discover,stable,sha,support,reason,bounded,type Source} from './core.ts';
const dir='a'.repeat(64),name='b'.repeat(64),path=BASE+'/'+dir+'/'+name;
function mock():Source{const b=new Uint8Array(96);b[0]=255;return {list:async p=>p===BASE?[dir]:[name],stat:async()=>({size:96,mtime:'1'}),header:async()=>b.slice(0,64),hash:async()=>sha(b),read:async()=>b};}
test('bounded directory and explicit selection candidates',async()=>{assert.equal((await discover(mock())).length,1);const s=mock();s.list=async()=>[dir,'c'.repeat(64)];await assert.rejects(discover(s),/ambiguous/);});
test('binary stable download',async()=>{const r=await stable(mock(),path);assert.equal(r.bytes[0],255);assert.equal(r.bytes.length,96);});
test('three retries only',async()=>{const s=mock();let n=0;s.read=async()=>{n++;return new Uint8Array(95)};await assert.rejects(stable(s,path),/unstable/);assert.equal(n,3);});
test('read refusal and invalid path',async()=>{const s=mock();s.read=async()=>{throw Error('Permission denied')};await assert.rejects(stable(s,path),/Permission/);await assert.rejects(stable(s,'/sdcard/other'),/invalid/);});
test('unsupported and insecure contexts',()=>{assert.throws(()=>support(false,true));assert.throws(()=>support(true,false));support(true,true);});
test('cancel usb auth and disconnect messages sanitized',()=>{assert.equal(reason(Error('NotFoundError cancelled')),'cancelled');assert.equal(reason(Error('claim interface failed')),'usb_busy');assert.equal(reason(Error('NetworkError disconnected')),'disconnected');assert.equal(reason(Error('secret unknown error')),'usb_or_auth_failed');});
test('timeout closes own resources',async()=>{let closed=0;await assert.rejects(bounded(new Promise(()=>{}),5,()=>closed++),/timeout/);assert.equal(closed,1);});
test('normal completion clears timeout',async()=>{let closed=0;assert.equal(await bounded(Promise.resolve(3),5,()=>closed++),3);await new Promise(r=>setTimeout(r,10));assert.equal(closed,0);});

test('actual Tango busy message and browser policy',()=>{assert.equal(reason(Error('The device is already in used by another program')),'usb_busy');const e=new Error('blocked');e.name='SecurityError';assert.equal(reason(e),'browser_policy');});

