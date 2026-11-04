import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/metatft-comps': {
        target: 'https://api-hc.metatft.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/metatft-comps/, '/tft-comps-api/comps_data?queue=1100'),
        headers: {
          Referer: 'https://www.metatft.com/',
          Origin: 'https://www.metatft.com'
        }
      },
      '/api/metatft-lookups': {
        target: 'https://data.metatft.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/metatft-lookups/, '/lookups')
      }
    }
  }
});