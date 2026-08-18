import { track } from '@vercel/analytics';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Initialize Google Analytics (GA4) if VITE_GA_MEASUREMENT_ID is configured
 */
export function initGoogleAnalytics() {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!gaId || typeof window === 'undefined') return;

  // Prevent duplicate script injection
  if (document.getElementById('ga-gtag-script')) return;

  const script = document.createElement('script');
  script.id = 'ga-gtag-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer?.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', gaId, {
    send_page_view: true,
  });
}

/**
 * Universal Event Tracking (Vercel Analytics + Google Analytics)
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  try {
    // 1. Vercel Web Analytics
    track(eventName, properties);
  } catch (e) {
    // Silently ignore if not in Vercel environment
  }

  try {
    // 2. Google Analytics (GA4)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, properties);
    }
  } catch (e) {
    // Silently ignore
  }

  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}:`, properties);
  }
}
