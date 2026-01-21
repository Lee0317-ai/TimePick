import posthog from 'posthog-js';

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, unknown>) => void;
    dataLayer: unknown[];
  }
}

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  // Google Analytics
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, params);
  }

  // PostHog
  posthog.capture(eventName, params);

  // Fallback for development
  if (typeof window.gtag === 'undefined') {
    console.log('Track Event:', eventName, params);
  }
};
