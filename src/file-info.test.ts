import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFile} from './file-info.ts';
test('file digest uses all binary bytes', async()=>{
 const result=await inspectFile(new Blob([new Uint8Array([0,255,10,13,128])]),'sample.bin');
 assert.equal(result.size,5);
 assert.equal(result.sha256,'896a425d1fade64e368ccca61003182138e59b7050bca9a7ec8f4ca99646f9fb');
});
test('empty and oversized files are rejected before reading',async()=>{
 await assert.rejects(inspectFile(new Blob([]),'empty'),/请选择/);
 let read=false;
 const large={size:16*1024*1024+1,arrayBuffer:async()=>{read=true;return new ArrayBuffer(0)}} as Blob;
 await assert.rejects(inspectFile(large,'large'),/请选择/);
 assert.equal(read,false);
});
