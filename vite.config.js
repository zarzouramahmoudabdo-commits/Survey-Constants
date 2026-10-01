import { defineConfig } from 'vite'

export default defineConfig({
  base: './',

  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        xy: 'xy.html',
        z: 'z.html',
        photos: 'photos.html',
        admin: 'admin.html'
      }
    }
  }
})
