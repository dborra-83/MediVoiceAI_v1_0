import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Default API Gateway URL if not specified
  const defaultApiUrl = 'https://hfttsqws09.execute-api.us-east-1.amazonaws.com/dev'
  const apiUrl = env.VITE_API_URL || defaultApiUrl
  
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      host: true,
      open: true,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.error('❌ Proxy error:', err.message);
              console.error('🔗 Target URL:', apiUrl);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('📤 Sending Request:', req.method, req.url, '→', apiUrl + req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              const status = proxyRes.statusCode;
              const statusIcon = status < 400 ? '✅' : '❌';
              console.log(`📥 Response: ${statusIcon} ${status} ${req.url}`);
            });
          },
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['react-bootstrap', 'bootstrap'],
            utils: ['axios', 'uuid']
          }
        }
      }
    },
    define: {
      global: 'globalThis',
      // Expose env variables to the app
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
    optimizeDeps: {
      include: ['axios', 'uuid']
    },
    // Environment variables validation
    envPrefix: ['VITE_'],
  }
}) 