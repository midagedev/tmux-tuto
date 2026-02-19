import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Clarity from '@microsoft/clarity';

export const ANALYTICS_CONSENT_KEY = 'analytics_consent';

export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';

declare global {
  interface Window {
    __tmuxCloudflareAnalyticsLoaded?: boolean;
    __tmuxMicrosoftClarityLoaded?: boolean;
  }
}

function getToken() {
  return import.meta.env.VITE_CF_WEB_ANALYTICS_TOKEN as string | undefined;
}

function getClarityProjectId() {
  return (import.meta.env.VITE_MS_CLARITY_PROJECT_ID as string | undefined) ?? 'vjo8dzp9t5';
}

function parseStoredConsent(raw: string | null): AnalyticsConsent {
  if (raw === 'granted' || raw === 'denied') {
    return raw;
  }
  return 'unknown';
}

export function readAnalyticsConsent() {
  if (typeof window === 'undefined') {
    return 'unknown' as AnalyticsConsent;
  }
  return parseStoredConsent(window.localStorage.getItem(ANALYTICS_CONSENT_KEY));
}

export function writeAnalyticsConsent(consent: Exclude<AnalyticsConsent, 'unknown'>) {
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
}

function injectCloudflareBeacon(token: string) {
  if (typeof document === 'undefined') {
    return false;
  }
  if (window.__tmuxCloudflareAnalyticsLoaded) {
    return true;
  }

  const existing = document.querySelector('script[data-tmux-cloudflare-beacon="true"]');
  if (existing) {
    window.__tmuxCloudflareAnalyticsLoaded = true;
    return true;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.setAttribute('data-tmux-cloudflare-beacon', 'true');
  script.setAttribute('data-cf-beacon', JSON.stringify({ token, spa: true }));
  document.head.appendChild(script);
  window.__tmuxCloudflareAnalyticsLoaded = true;
  return true;
}

function injectMicrosoftClarity(projectId: string) {
  if (typeof window === 'undefined') {
    return false;
  }
  if (window.__tmuxMicrosoftClarityLoaded) {
    return true;
  }
  Clarity.init(projectId);
  window.__tmuxMicrosoftClarityLoaded = true;
  return true;
}

export function useAnalyticsConsentState() {
  const [consent, setConsent] = useState<AnalyticsConsent>('unknown');

  useEffect(() => {
    setConsent(readAnalyticsConsent());
  }, []);

  const updateConsent = (next: Exclude<AnalyticsConsent, 'unknown'>) => {
    writeAnalyticsConsent(next);
    setConsent(next);
  };

  return useMemo(
    () => ({
      consent,
      setGranted: () => updateConsent('granted'),
      setDenied: () => updateConsent('denied'),
    }),
    [consent],
  );
}

export function useCloudflareAnalytics(consent: AnalyticsConsent) {
  const location = useLocation();

  useEffect(() => {
    if (consent !== 'granted') {
      return;
    }
    const token = getToken();
    if (!token) {
      return;
    }
    injectCloudflareBeacon(token);
  }, [consent]);

  useEffect(() => {
    if (consent !== 'granted') {
      return;
    }
    if (!window.__tmuxCloudflareAnalyticsLoaded) {
      return;
    }

    // Cloudflare beacon tracks SPA routes via history API.
    // Keep this explicit marker for debugging route capture during QA.
    window.dispatchEvent(new CustomEvent('tmux:route-view', { detail: location.pathname + location.search }));
  }, [consent, location.pathname, location.search]);
}

export function useMicrosoftClarity(consent: AnalyticsConsent) {
  useEffect(() => {
    if (consent !== 'granted') {
      return;
    }
    const projectId = getClarityProjectId();
    if (!projectId) {
      return;
    }
    injectMicrosoftClarity(projectId);
  }, [consent]);
}
