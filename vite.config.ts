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
    chunkSizeWarningLimit: 1000,
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
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-checkbox'],
          charts: ['recharts'],
          pdf: ['jspdf', 'html2canvas'],
          excel: ['exceljs'],
          qr: ['qrcode', 'jsbarcode'],
          utils: ['date-fns', 'zustand']
        }
      },
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT') return
        if (warning.message.includes('core-js')) return
        if (warning.message.includes('define-globalThis-property')) return
        if (warning.message.includes('dynamic import will not move module into another chunk')) return
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
