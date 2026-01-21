import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 👈 මේ පේළිය තමයි White Screen එක නැති කරන්නේ
  server: {
    port: 5173,
    strictPort: true,
  }
})