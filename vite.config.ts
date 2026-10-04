import {readFileSync} from 'node:fs';
import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
 const configured=JSON.parse(readFileSync(new URL('./backend-origin.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
 const origin=loadEnv(mode,process.cwd(),'VITE_').VITE_API_ORIGIN||configured.origin||'';
 if(origin && (new URL(origin).origin!==origin || !origin.startsWith('https://')))throw Error('Backend must be an exact HTTPS origin');
 return {base:'./',define:{__API_ORIGIN__:JSON.stringify(origin)},plugins:[{name:'api-csp',transformIndexHtml(html){return html.replace("connect-src 'self'",`connect-src 'self'${origin?' '+origin:''}`).replace("img-src 'self'",`img-src 'self'${origin?' '+origin:''}`);}}]};
});
