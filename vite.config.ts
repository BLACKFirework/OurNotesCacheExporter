import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
 const origin=loadEnv(mode,process.cwd(),'VITE_').VITE_API_ORIGIN||'';
 if(origin && (new URL(origin).origin!==origin || !origin.startsWith('https://')))throw Error('Backend must be an exact HTTPS origin');
 return {base:'./',define:{__API_ORIGIN__:JSON.stringify(origin)},plugins:[{name:'api-csp',transformIndexHtml(html){return html.replace("connect-src 'self'",`connect-src 'self'${origin?' '+origin:''}`).replace("img-src 'self'",`img-src 'self'${origin?' '+origin:''}`);}}]};
});
