import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
 const origin=loadEnv(mode,process.cwd(),'VITE_').VITE_API_ORIGIN??'';
 if(origin && new URL(origin).origin!==origin)throw Error('VITE_API_ORIGIN must be an exact origin');
 if(origin && !origin.startsWith('https://') && !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('HTTPS API required');
 return {base:'./',define:{__API_ORIGIN__:JSON.stringify(origin)},plugins:[{name:'api-csp',transformIndexHtml(html){return html.replace("connect-src 'self'",`connect-src 'self'${origin?' '+origin:''}`).replace("img-src 'self'",`img-src 'self'${origin?' '+origin:''}`);}}]};
});
