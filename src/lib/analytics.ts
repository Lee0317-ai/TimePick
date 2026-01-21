
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, unknown>) => void;
    dataLayer: unknown[];
  }
}

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, params);
  } else {
    console.log('Track Event:', eventName, params);
  }
};
