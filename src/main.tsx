import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PostHogProvider } from 'posthog-js/react';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';

// 在渲染前初始化 PostHog
if (typeof window !== 'undefined') {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', // 推荐配置
    capture_pageview: false, // 避免与路由追踪冲突
    autocapture: false, // 禁用自动捕获以减少 DOM 干扰
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </StrictMode>
);
