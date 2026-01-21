import posthog from 'posthog-js';

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, unknown>) => void;
    dataLayer: unknown[];
  }
}

// 检查 PostHog 是否已初始化
const isPostHogReady = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!posthog.get_distinct_id();
  } catch {
    return false;
  }
};

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  // Google Analytics
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, params);
  }

  // PostHog - 确保已初始化后再调用
  if (isPostHogReady()) {
    try {
      posthog.capture(eventName, params);
    } catch (e) {
      // 静默处理 PostHog 错误
      if (import.meta.env.DEV) {
        console.debug('PostHog capture error:', e);
      }
    }
  }
};
