import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export default defineConfig({root:'admin',publicDir:'../client/public',envDir:'..',plugins:[react()],server:{host:'localhost',port:5175,strictPort:true,proxy:{'/api':'http://localhost:3100'},fs:{allow:['..']}},build:{outDir:'../dist-admin',emptyOutDir:true}});
