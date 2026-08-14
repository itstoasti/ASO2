import { CompetitorApp, DiscoveredCompetitorKeyword } from './competitor-types';

const COMPETITORS_CACHE_KEY_PREFIX = 'aso_competitors_cache_';
const COMPETITOR_KEYWORDS_CACHE_KEY_PREFIX = 'aso_comp_kw_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedCompetitorsPayload {
  targetAppId: string;
  platform: string;
  country: string;
  lastScannedAt: string;
  competitors: CompetitorApp[];
}

interface CachedKeywordsPayload {
  competitorId: string;
  lastScannedAt: string;
  keywords: DiscoveredCompetitorKeyword[];
}

function getCacheKey(targetAppId: string, platform: string, country = 'us'): string {
  return `${COMPETITORS_CACHE_KEY_PREFIX}${targetAppId}_${platform}_${country}`.toLowerCase();
}

/**
 * Retrieve cached competitors for a specific target app, platform, and country.
 * Returns null if not found. Returns isFresh = false if older than 24 hours.
 */
export function getCachedCompetitors(
  targetAppId: string,
  platform = 'ios',
  country = 'us'
): { competitors: CompetitorApp[]; lastScannedAt: string; isFresh: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getCacheKey(targetAppId, platform, country);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const payload: CachedCompetitorsPayload = JSON.parse(raw);
    if (!payload || !Array.isArray(payload.competitors)) return null;

    const scannedTime = new Date(payload.lastScannedAt).getTime();
    const now = Date.now();
    const isFresh = now - scannedTime < CACHE_TTL_MS;

    return {
      competitors: payload.competitors,
      lastScannedAt: payload.lastScannedAt,
      isFresh,
    };
  } catch (e) {
    console.error('Error reading competitor cache:', e);
    return null;
  }
}

/**
 * Save discovered competitors with timestamp for 24-hour cache.
 */
export function saveCachedCompetitors(
  targetAppId: string,
  platform = 'ios',
  competitors: CompetitorApp[],
  country = 'us'
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getCacheKey(targetAppId, platform, country);
    const payload: CachedCompetitorsPayload = {
      targetAppId,
      platform,
      country,
      lastScannedAt: new Date().toISOString(),
      competitors,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error('Error writing competitor cache:', e);
  }
}

/**
 * Retrieve cached ranked keywords for a specific competitor.
 */
export function getCachedCompetitorKeywords(
  competitorId: string
): { keywords: DiscoveredCompetitorKeyword[]; lastScannedAt: string; isFresh: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${COMPETITOR_KEYWORDS_CACHE_KEY_PREFIX}${competitorId}`.toLowerCase();
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const payload: CachedKeywordsPayload = JSON.parse(raw);
    if (!payload || !Array.isArray(payload.keywords)) return null;

    const scannedTime = new Date(payload.lastScannedAt).getTime();
    const now = Date.now();
    const isFresh = now - scannedTime < CACHE_TTL_MS;

    return {
      keywords: payload.keywords,
      lastScannedAt: payload.lastScannedAt,
      isFresh,
    };
  } catch (e) {
    console.error('Error reading competitor keywords cache:', e);
    return null;
  }
}

/**
 * Save ranked keywords for a competitor with 24-hour timestamp.
 */
export function saveCachedCompetitorKeywords(
  competitorId: string,
  keywords: DiscoveredCompetitorKeyword[]
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${COMPETITOR_KEYWORDS_CACHE_KEY_PREFIX}${competitorId}`.toLowerCase();
    const payload: CachedKeywordsPayload = {
      competitorId,
      lastScannedAt: new Date().toISOString(),
      keywords,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error('Error writing competitor keywords cache:', e);
  }
}

const COMPETITOR_REVIEWS_CACHE_KEY_PREFIX = 'aso_comp_reviews_cache_';

interface CachedReviewsPayload {
  competitorId: string;
  lastScannedAt: string;
  analysis: import('./competitor-types').CompetitorReviewAnalysis;
}

/**
 * Retrieve cached review intelligence & pain point analysis for a competitor.
 */
export function getCachedCompetitorReviews(
  competitorId: string
): { analysis: import('./competitor-types').CompetitorReviewAnalysis; lastScannedAt: string; isFresh: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${COMPETITOR_REVIEWS_CACHE_KEY_PREFIX}${competitorId}`.toLowerCase();
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const payload: CachedReviewsPayload = JSON.parse(raw);
    if (!payload || !payload.analysis || !Array.isArray(payload.analysis.reviews)) return null;

    const scannedTime = new Date(payload.lastScannedAt).getTime();
    const now = Date.now();
    const isFresh = now - scannedTime < CACHE_TTL_MS;

    return {
      analysis: payload.analysis,
      lastScannedAt: payload.lastScannedAt,
      isFresh,
    };
  } catch (e) {
    console.error('Error reading competitor reviews cache:', e);
    return null;
  }
}

/**
 * Save review intelligence analysis for a competitor with 24-hour timestamp.
 */
export function saveCachedCompetitorReviews(
  competitorId: string,
  analysis: import('./competitor-types').CompetitorReviewAnalysis
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${COMPETITOR_REVIEWS_CACHE_KEY_PREFIX}${competitorId}`.toLowerCase();
    const payload: CachedReviewsPayload = {
      competitorId,
      lastScannedAt: new Date().toISOString(),
      analysis,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error('Error writing competitor reviews cache:', e);
  }
}

