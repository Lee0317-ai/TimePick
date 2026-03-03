import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: '/',
    build: {
      outDir: 'dist',
      // 禁用 source map，防止源码泄露
      sourcemap: false,
      // 代码压缩配置 - 使用esbuild（更快更稳定）
      minify: 'esbuild',
      esbuildOptions: {
        drop: isProduction ? ['console', 'debugger'] : [],
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
      },
      // Rollup 打包配置
      rollupOptions: {
        output: {
          // 代码分割
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          },
          // 混淆 chunk 文件名
          chunkFileNames: isProduction
            ? 'assets/[hash:8].js'
            : 'assets/[name]-[hash].js',
          entryFileNames: isProduction
            ? 'assets/[hash:8].js'
            : 'assets/[name]-[hash].js',
          assetFileNames: isProduction
            ? 'assets/[hash:8][extname]'
            : 'assets/[name]-[hash][extname]',
        },
      },
    },
    // CSS 优化
    css: {
      devSourcemap: false,
    },
  };
});
