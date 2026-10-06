import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {renderSocialHtml} from './server/social-preview.js';
export default defineConfig(({mode}) => {
 const env=loadEnv(mode,process.cwd(),'');
 const publicUrl=env.PUBLIC_WEB_URL || env.VITE_PUBLIC_URL || 'http://localhost:5173';
 const apiUrl=env.VITE_API_URL || '/api';
 return { root: 'client', envDir: '..', plugins: [react(), {
  name:'invictus-social-preview',
  transformIndexHtml:html=>renderSocialHtml(html,{publicUrl,apiUrl})
 }], server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3100' } }, build: { outDir: '../dist', emptyOutDir: true } };
});
