import { CountryCode, Platform } from '@/lib/types';
import { getIosAutocomplete } from '@/lib/ios/autocomplete';
import { getIosSearchApps } from '@/lib/ios/app-store-search';
import { getOfficialAsaPopularity, estimateIosPopularityFallback } from '@/lib/ios/search-ads-api';
import { convertPopularityToImpressions, convertAndroidDemandToVolume, getDemandLabel } from '@/lib/scoring/impressions';
import { getAndroidAutocomplete } from '@/lib/android/autocomplete';
import { getAndroidSearchApps } from '@/lib/android/play-store-search';
import { calculateKeywordDifficulty } from '@/lib/scoring/difficulty';
import { calculateOpportunityScore, calculateRelevance } from '@/lib/scoring/opportunity';
import { extractSeedKeywordsFromUrl } from '@/lib/keyword-extractor';
import { generateAiKeywordExpansions } from '@/lib/ai/keyword-generator';

export interface ResearchToolInput {
  seedKeyword?: string;
  platform?: Platform;
  country?: CountryCode;
  appUrl?: string;
  websiteUrl?: string;
}

export interface RankCheckToolInput {
  appId: string;
  keywords: string[];
  platform?: 'ios' | 'android';
  country?: CountryCode;
}

export interface AppLookupToolInput {
  appId: string;
  platform?: 'ios' | 'android';
  country?: CountryCode;
}

export interface ExtractKeywordsToolInput {
  targetUrl: string;
}

/**
 * Executes keyword research across App Store and Google Play
 */
export async function executeKeywordResearch(input: ResearchToolInput) {
  let primarySeed = input.seedKeyword ? input.seedKeyword.trim() : '';
  const platform: Platform = input.platform || 'both';
  const country: CountryCode = input.country || 'us';
  const appUrl = input.appUrl || '';
  const websiteUrl = input.websiteUrl || '';

  let extractedSeeds: string[] = [];
  if (websiteUrl || appUrl) {
    const target = websiteUrl || appUrl;
    extractedSeeds = await extractSeedKeywordsFromUrl(target);
    if (!primarySeed && extractedSeeds.length > 0) {
      primarySeed = extractedSeeds[0];
    }
  }

  if (!primarySeed) {
    primarySeed = 'fitness app';
  }

  const results: any[] = [];

  // iOS Research pipeline
  const fetchIos = async () => {
    if (platform !== 'ios' && platform !== 'both') return [];
    try {
      const [iosAutocomplete, aiExpansions] = await Promise.all([
        getIosAutocomplete(primarySeed, country),
        generateAiKeywordExpansions(primarySeed, 'ios'),
      ]);

      const combinedSet = new Set<string>();
      iosAutocomplete.forEach((k) => combinedSet.add(k.toLowerCase().trim()));
      aiExpansions.forEach((a) => combinedSet.add(a.keyword.toLowerCase().trim()));

      const targetList = Array.from(combinedSet).slice(0, 15);
      const asaMap = await getOfficialAsaPopularity(targetList, null);
      const iosSearchResults = await Promise.all(targetList.map((kw) => getIosSearchApps(kw, country)));

      return targetList.map((kw, idx) => {
        const searchApps = iosSearchResults[idx];
        const popData = asaMap.get(kw.toLowerCase()) || { popularity: 25, isOfficial: false };
        const impressions = convertPopularityToImpressions(popData.popularity);
        const difficulty = calculateKeywordDifficulty(kw, searchApps.apps, searchApps.totalResults);
        const relevanceObj = calculateRelevance(primarySeed, kw);
        const oppScore = calculateOpportunityScore(popData.popularity, difficulty, relevanceObj.score);

        return {
          keyword: kw,
          platform: 'ios',
          searchPopularity: popData.popularity,
          estimatedImpressions: impressions,
          demandLabel: getDemandLabel(popData.popularity),
          difficulty,
          opportunityScore: oppScore,
          competingApps: searchApps.totalResults,
          relevance: relevanceObj.label,
          relevanceScore: relevanceObj.score,
          topApps: searchApps.apps.slice(0, 3).map((a) => ({ id: a.id, name: a.name, developer: a.developer })),
        };
      });
    } catch (e) {
      console.error('MCP iOS research error:', e);
      return [];
    }
  };

  // Android Research pipeline
  const fetchAndroid = async () => {
    if (platform !== 'android' && platform !== 'both') return [];
    try {
      const [androidAutocomplete, aiExpansions] = await Promise.all([
        getAndroidAutocomplete(primarySeed, country),
        generateAiKeywordExpansions(primarySeed, 'android'),
      ]);

      const combinedSet = new Set<string>();
      androidAutocomplete.forEach((k) => combinedSet.add(k.toLowerCase().trim()));
      aiExpansions.forEach((a) => combinedSet.add(a.keyword.toLowerCase().trim()));

      const targetList = Array.from(combinedSet).slice(0, 15);
      const androidSearchResults = await Promise.all(targetList.map((kw) => getAndroidSearchApps(kw, country)));

      return targetList.map((kw, idx) => {
        const searchApps = androidSearchResults[idx];
        const demandScore = searchApps.estimatedDemandScore;
        const estVolume = convertAndroidDemandToVolume(demandScore);
        const difficulty = calculateKeywordDifficulty(kw, searchApps.apps, searchApps.totalResults);
        const relevanceObj = calculateRelevance(primarySeed, kw);
        const oppScore = calculateOpportunityScore(demandScore, difficulty, relevanceObj.score);

        return {
          keyword: kw,
          platform: 'android',
          searchPopularity: demandScore,
          estimatedImpressions: estVolume,
          demandLabel: getDemandLabel(demandScore),
          difficulty,
          opportunityScore: oppScore,
          competingApps: searchApps.totalResults,
          relevance: relevanceObj.label,
          relevanceScore: relevanceObj.score,
          topApps: searchApps.apps.slice(0, 3).map((a) => ({ id: a.id, name: a.name, developer: a.developer })),
        };
      });
    } catch (e) {
      console.error('MCP Android research error:', e);
      return [];
    }
  };

  const [iosRes, androidRes] = await Promise.all([fetchIos(), fetchAndroid()]);
  results.push(...iosRes, ...androidRes);

  results.sort((a, b) => b.opportunityScore - a.opportunityScore);

  const totalKeywords = results.length;
  const highOpportunityCount = results.filter((r) => r.opportunityScore >= 70).length;
  const avgDifficulty = totalKeywords > 0 ? Math.round(results.reduce((acc, r) => acc + r.difficulty, 0) / totalKeywords) : 0;

  return {
    seedKeyword: primarySeed,
    country,
    platform,
    totalKeywords,
    highOpportunityCount,
    avgDifficulty,
    extractedSeedKeywords: extractedSeeds,
    results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Checks ranking position for an app across specified keywords
 */
export async function executeRankCheck(input: RankCheckToolInput) {
  const { appId, keywords, platform = 'ios', country = 'us' } = input;
  if (!appId) throw new Error('appId is required');
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    throw new Error('keywords array is required');
  }

  const cleanAppId = appId.toLowerCase().trim();
  const rankResults: any[] = [];

  for (const kw of keywords) {
    const cleanKw = kw.trim();
    if (!cleanKw) continue;

    let apps: any[] = [];
    let totalResults = 0;
    let searchPopularity = 30;

    if (platform === 'android') {
      const res = await getAndroidSearchApps(cleanKw, country);
      apps = res.apps;
      totalResults = res.totalResults;
      searchPopularity = res.estimatedDemandScore || 40;
    } else {
      const res = await getIosSearchApps(cleanKw, country);
      apps = res.apps;
      totalResults = res.totalResults;
      searchPopularity = estimateIosPopularityFallback(cleanKw);
    }

    let foundRank: number | null = null;
    const matchIndex = apps.findIndex((app) => {
      const idMatch = String(app.id).toLowerCase() === cleanAppId;
      const nameMatch = app.name.toLowerCase().includes(cleanAppId);
      const devMatch = app.developer.toLowerCase().includes(cleanAppId);
      return idMatch || nameMatch || devMatch;
    });

    if (matchIndex >= 0) {
      foundRank = matchIndex + 1;
    }

    const difficulty = calculateKeywordDifficulty(cleanKw, apps, totalResults);

    rankResults.push({
      keyword: cleanKw,
      rank: foundRank,
      searchPopularity,
      difficulty,
      competingApps: totalResults,
      top3Competitors: apps.slice(0, 3).map((a) => ({ id: a.id, name: a.name, developer: a.developer })),
    });
  }

  return {
    appId,
    platform,
    country,
    results: rankResults,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Resolves App metadata details
 */
export async function executeAppLookup(input: AppLookupToolInput) {
  const { appId, platform = 'ios', country = 'us' } = input;
  const cleanInput = appId.trim();

  if (platform === 'ios' || (!platform && /^\d+$/.test(cleanInput))) {
    const url = /^\d+$/.test(cleanInput)
      ? `https://itunes.apple.com/lookup?id=${cleanInput}&country=${country}`
      : `https://itunes.apple.com/search?term=${encodeURIComponent(cleanInput)}&entity=software&country=${country}&limit=1`;

    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          id: item.trackId ? String(item.trackId) : cleanInput,
          name: item.trackName || cleanInput,
          developer: item.artistName || 'Developer',
          rating: item.averageUserRating || 0,
          reviewCount: item.userRatingCount || 0,
          iconUrl: item.artworkUrl512 || item.artworkUrl100,
          platform: 'ios',
          country,
        };
      }
    }
  }

  return {
    id: cleanInput,
    name: cleanInput,
    developer: 'Developer',
    platform: 'android',
    country,
  };
}

/**
 * Extracts seed keywords from a URL or App Store listing
 */
export async function executeExtractKeywords(input: ExtractKeywordsToolInput) {
  const seeds = await extractSeedKeywordsFromUrl(input.targetUrl);
  return {
    targetUrl: input.targetUrl,
    extractedKeywords: seeds,
    count: seeds.length,
  };
}
