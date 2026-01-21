import { createRoot } from 'react-dom/client';
import { PostHogProvider } from 'posthog-js/react';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';

// 初始化 PostHog
const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

if (posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: false,
    autocapture: false,
    disable_session_recording: true,
    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        console.log('PostHog initialized successfully');
      }
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <PostHogProvider client={posthog}>
    <App />
  </PostHogProvider>
);
