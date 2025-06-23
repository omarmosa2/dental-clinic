import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    commonjsOptions: {
      ignoreTryCatch: false,
      include: [/node_modules/],
      exclude: ['core-js/**']
    },
    rollupOptions: {
      external: [
        'electron',
        'node-machine-id',
        'crypto',
        'os',
        'electron-store',
        'child_process',
        'fs',
        'path',
        /^core-js/
      ],
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT') return
        if (warning.message.includes('core-js')) return
        if (warning.message.includes('define-globalThis-property')) return
        warn(warning)
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  define: {
    global: 'globalThis',
  },
})
