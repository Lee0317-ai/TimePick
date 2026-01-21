import posthog from 'posthog-js';

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, unknown>) => void;
    dataLayer: unknown[];
  }
}

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  // Google Analytics
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
    } catch {
      // 静默处理 GA 错误
    }
  }

  // PostHog
  if (typeof window !== 'undefined') {
    try {
      // 检查 PostHog 是否已初始化
      const distinctId = posthog.get_distinct_id?.();
      if (distinctId) {
        posthog.capture(eventName, params);
      }
    } catch {
      // 静默处理 PostHog 错误
    }
  }
};
