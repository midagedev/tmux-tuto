import type { MilestoneSlug } from './milestones';
import { encodeSharePayload, type SharePayload } from './payload';

export function buildSharePath(milestoneSlug: MilestoneSlug, payload?: SharePayload) {
  const pathname = `/share/${milestoneSlug}`;
  if (!payload) {
    return pathname;
  }

  const encoded = encodeSharePayload(payload);
  return `${pathname}?d=${encoded}`;
}

export function buildAbsoluteShareUrl(milestoneSlug: MilestoneSlug, payload?: SharePayload) {
  const url = new URL(window.location.href);
  url.pathname = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/share/${milestoneSlug}`.replace(/\/{2,}/g, '/');
  url.search = '';
  if (payload) {
    url.searchParams.set('d', encodeSharePayload(payload));
  }
  return url.toString();
}

export function buildTwitterIntentUrl(shareUrl: string, text: string) {
  const intent = new URL('https://x.com/intent/tweet');
  intent.searchParams.set('url', shareUrl);
  intent.searchParams.set('text', text);
  return intent.toString();
}
