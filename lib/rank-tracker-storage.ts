import { TrackedApp, TrackedKeyword } from './rank-tracker-types';

const APPS_STORAGE_KEY = 'aso_rank_tracker_apps_v1';
const KEYWORDS_STORAGE_KEY = 'aso_rank_tracker_keywords_v1';

export function getTrackedApps(): TrackedApp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(APPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading tracked apps from localStorage:', e);
    return [];
  }
}

export function saveTrackedApp(app: TrackedApp): void {
  if (typeof window === 'undefined') return;
  const existing = getTrackedApps();
  const filtered = existing.filter((a) => a.id !== app.id);
  const updated = [app, ...filtered];
  localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(updated));
}

export function removeTrackedApp(appId: string): void {
  if (typeof window === 'undefined') return;
  const existing = getTrackedApps();
  const updated = existing.filter((a) => a.id !== appId);
  localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(updated));

  // Also remove all tracked keywords for this app
  const keywords = getTrackedKeywords();
  const updatedKeywords = keywords.filter((k) => k.targetAppId !== appId);
  localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(updatedKeywords));
}

export function getTrackedKeywords(): TrackedKeyword[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYWORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading tracked keywords from localStorage:', e);
    return [];
  }
}

export function saveTrackedKeyword(keyword: TrackedKeyword): void {
  if (typeof window === 'undefined') return;
  const existing = getTrackedKeywords();
  const index = existing.findIndex(
    (k) => k.id === keyword.id || (k.keyword.toLowerCase() === keyword.keyword.toLowerCase() && k.targetAppId === keyword.targetAppId)
  );

  let updated: TrackedKeyword[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = { ...existing[index], ...keyword };
  } else {
    updated = [keyword, ...existing];
  }

  localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(updated));
}

export function removeTrackedKeyword(keywordId: string): void {
  if (typeof window === 'undefined') return;
  const existing = getTrackedKeywords();
  const updated = existing.filter((k) => k.id !== keywordId);
  localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(updated));
}

export function isKeywordTracked(keyword: string, targetAppId?: string): boolean {
  if (typeof window === 'undefined') return false;
  const keywords = getTrackedKeywords();
  const clean = keyword.toLowerCase().trim();
  return keywords.some(
    (k) => k.keyword.toLowerCase().trim() === clean && (!targetAppId || k.targetAppId === targetAppId)
  );
}
