import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import obfuscator from 'rollup-plugin-obfuscator';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  const plugins = [react()];

  // 生产环境添加代码混淆
  if (isProduction) {
    plugins.push(
      obfuscator({
        include: ['src/**/*.tsx', 'src/**/*.ts'],
        exclude: ['node_modules/**'],
        apply: 'build',
        options: {
          // 控制流扁平化 - 大幅增加反编译难度
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,

          // 死代码注入 - 添加无用代码混淆逻辑
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,

          // 调试保护 - 检测开发者工具
          debugProtection: true,
          debugProtectionInterval: 2000,

          // 禁用 console 输出
          disableConsoleOutput: true,

          // 标识符混淆 - 将变量名改为随机字符串
          identifierNamesGenerator: 'mangled-shuffled',
          identifiersDictionary: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
          renameGlobals: true,

          // 日志移除
          log: false,

          // 数字混淆
          numbersToExpressions: true,

          // 字符串混淆 - 将字符串转为 Unicode 或编码
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayCallsTransformThreshold: 0.5,
          stringArrayEncoding: ['base64', 'rc4'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 1,
          stringArrayWrappersChainedCalls: true,
          stringArrayThreshold: 0.75,

          // 自防御 - 检测代码篡改
          selfDefending: true,

          // 简化设置
          simplify: true,

          // 分割字符串
          splitStrings: true,
          splitStringsChunkLength: 10,

          // 转换对象键
          transformObjectKeys: true,

          // Unicode 转义序列
          unicodeEscapeSequence: true,

          // 保留关键内容
          reservedNames: [],
          reservedStrings: [],

          // 目标环境
          target: 'browser',

          // 种子 - 确保混淆结果一致
          seed: 0,

          // 源映射 - 禁用以确保安全
          sourceMap: false,
          sourceMapBaseUrl: '',
          sourceMapFileName: '',
        },
      })
    );
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: plugins as any,
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
      // 代码压缩和混淆配置
      minify: 'terser',
      terserOptions: {
        compress: {
          // 压缩级别
          drop_console: isProduction, // 移除 console
          drop_debugger: isProduction, // 移除 debugger
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
          // 高级压缩
          passes: 2,
          // 混淆变量名
          keep_fnames: false,
          keep_classnames: false,
        },
        mangle: {
          // 混淆变量名和函数名
          properties: {
            regex: /^_/, // 混淆以下划线开头的私有属性
          },
        },
        format: {
          // 格式化选项
          comments: false, // 移除所有注释
          beautify: false, // 不美化输出
        },
      },
      // Rollup 打包配置
      rollupOptions: {
        output: {
          // 代码分割，增加分析难度
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
      devSourcemap: false, // 禁用 CSS source map
    },
  };
});