import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: 'client', envDir: '..', plugins: [react()], server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3100' } }, build: { outDir: '../dist', emptyOutDir: true } });
