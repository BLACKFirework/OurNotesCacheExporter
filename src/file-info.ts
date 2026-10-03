import {LIMIT, sha} from './core.ts';
export interface FileInfo {name:string;size:number;sha256:string;}
export async function inspectFile(file:Blob,name:string):Promise<FileInfo>{
 if(!Number.isFinite(file.size)||file.size<1||file.size>LIMIT)throw Error('请选择 1 byte–16 MiB 的文件。');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.byteLength!==file.size)throw Error('文件读取不完整，请重新选择。');
 return {name,size:file.size,sha256:await sha(bytes)};
}
