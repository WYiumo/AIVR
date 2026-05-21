import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  server: {
    host: '0.0.0.0', // 暴露到局域网
    https: true,     // 开启 HTTPS
    port: 5173       // 端口
  },
  plugins: [
    mkcert() // 自动生成本地可信证书
  ]
})