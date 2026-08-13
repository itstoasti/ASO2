import { NextRequest, NextResponse } from 'next/server';
import { CountryCode, KeywordResult, Platform, ResearchResponse, AsaCredentials, AppMetadata, PlacementBreakdown } from '@/lib/types';
import { researchCache } from '@/lib/cache';
import { getIosAutocomplete } from '@/lib/ios/autocomplete';
import { getIosSearchApps } from '@/lib/ios/app-store-search';
import { getOfficialAsaPopularity } from '@/lib/ios/search-ads-api';
import { convertPopularityToImpressions, convertAndroidDemandToVolume, getDemandLabel } from '@/lib/scoring/impressions';
import { getAndroidAutocomplete } from '@/lib/android/autocomplete';
import { getAndroidSearchApps } from '@/lib/android/play-store-search';
import { calculateKeywordDifficulty } from '@/lib/scoring/difficulty';
import { calculateOpportunityScore, calculateRelevance } from '@/lib/scoring/opportunity';
import { extractSeedKeywordsFromUrl } from '@/lib/keyword-extractor';
import { generateAiKeywordExpansions, AiKeywordSuggestion } from '@/lib/ai/keyword-generator';

function computePlacementBreakdown(keyword: string, apps: AppMetadata[]): { apps: AppMetadata[]; breakdown: PlacementBreakdown } {
  const kwClean = keyword.toLowerCase().trim();
  const top10 = apps.slice(0, 10);

  let titleMatches = 0;
  let subtitleMatches = 0;
  let descriptionMatches = 0;
  let totalVelocity = 0;

  const enrichedApps: AppMetadata[] = top10.map((app) => {
    const nameLower = app.name.toLowerCase();
    const subLower = (app.subtitle || '').toLowerCase();

    let matchedIn: 'title' | 'subtitle' | 'description' = 'description';
    if (nameLower.includes(kwClean)) {
      matchedIn = 'title';
      titleMatches++;
    } else if (subLower.includes(kwClean)) {
      matchedIn = 'subtitle';
      subtitleMatches++;
    } else {
      descriptionMatches++;
    }

    // Model 30-day review growth velocity (typically 1.5% - 3.5% of total reviews per month)
    const reviewVelocity30d = Math.round((app.reviewCount || 0) * (0.015 + (app.position % 3) * 0.008));
    totalVelocity += reviewVelocity30d;

    return {
      ...app,
      matchedIn,
      reviewVelocity30d,
    };
  });

  const total = Math.max(1, top10.length);
  const titlePercentage = Math.round((titleMatches / total) * 100);
  const subtitlePercentage = Math.round((subtitleMatches / total) * 100);
  const descriptionPercentage = Math.max(0, 100 - titlePercentage - subtitlePercentage);

  const titleOpportunity: 'High' | 'Medium' | 'Low' =
    titlePercentage <= 30 ? 'High' : titlePercentage <= 60 ? 'Medium' : 'Low';

  const avg30dReviewVelocity = Math.round(totalVelocity / Math.max(1, Math.min(5, enrichedApps.length)));

  return {
    apps: enrichedApps,
    breakdown: {
      titlePercentage,
      subtitlePercentage,
      descriptionPercentage,
      titleOpportunity,
      avg30dReviewVelocity,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const seedKeyword: string = body.seedKeyword ? String(body.seedKeyword).trim() : '';
    const platform: Platform = body.platform || 'both';
    const country: CountryCode = body.country || 'us';
    const appUrl: string = body.appUrl || '';
    const websiteUrl: string = body.websiteUrl || '';
    const credentials: AsaCredentials | null = body.asaCredentials || null;

    if (!seedKeyword && !appUrl && !websiteUrl) {
      return NextResponse.json({ error: 'Primary seed keyword or URL is required.' }, { status: 400 });
    }

    const cacheKey = `res_${seedKeyword.toLowerCase()}_${platform}_${country}_${websiteUrl}_${appUrl}`;
    const cached = researchCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let primarySeed = seedKeyword;
    let extractedSeeds: string[] = [];

    // Extract seed keywords from URL if provided
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

    const results: KeywordResult[] = [];

    let asaConfigured = false;
    let asaAuthenticated = false;
    let asaMessage = 'Using estimated iOS volume (No ASA credentials provided)';

    const iosTask = async (): Promise<KeywordResult[]> => {
      if (platform !== 'ios' && platform !== 'both') return [];
      const iosResults: KeywordResult[] = [];
      try {
        const [iosAutocomplete, aiExpansions] = await Promise.all([
          getIosAutocomplete(primarySeed, country),
          generateAiKeywordExpansions(primarySeed, 'ios'),
        ]);

        const aiMap = new Map<string, AiKeywordSuggestion>();
        aiExpansions.forEach((a) => aiMap.set(a.keyword.toLowerCase().trim(), a));

        const combinedSet = new Set<string>();
        iosAutocomplete.forEach((k) => combinedSet.add(k.toLowerCase().trim()));
        aiExpansions.forEach((a) => combinedSet.add(a.keyword.toLowerCase().trim()));

        const targetList = Array.from(combinedSet).slice(0, 18);

        const asaMap = await getOfficialAsaPopularity(targetList, credentials);
        const firstItem = asaMap.values().next().value;
        if (firstItem && firstItem.isOfficial) {
          asaConfigured = true;
          asaAuthenticated = true;
          asaMessage = 'Connected to official Apple Search Ads API';
        }

        const iosSearchResults = await Promise.all(targetList.map((kw) => getIosSearchApps(kw, country)));

        iosSearchResults.forEach((searchApps, idx) => {
          const kw = targetList[idx];
          const popData = asaMap.get(kw.toLowerCase()) || { popularity: 25, isOfficial: false };
          const impressions = convertPopularityToImpressions(popData.popularity);
          const difficulty = calculateKeywordDifficulty(kw, searchApps.apps, searchApps.totalResults);
          const relevanceObj = calculateRelevance(primarySeed, kw);
          const oppScore = calculateOpportunityScore(popData.popularity, difficulty, relevanceObj.score);

          const { apps: enrichedApps, breakdown } = computePlacementBreakdown(kw, searchApps.apps);
          const aiInfo = aiMap.get(kw.toLowerCase().trim());

          iosResults.push({
            id: `ios-${kw.replace(/\s+/g, '-')}`,
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
            topApps: enrichedApps,
            isEstimatedVolume: !popData.isOfficial,
            dataQualityNote: popData.isOfficial
              ? 'Official Apple Search Ads Search Popularity score'
              : 'Estimated search popularity based on store hints & app rankings',
            placementBreakdown: breakdown,
            isAiGenerated: !!aiInfo,
            aiRelevanceReason: aiInfo?.relevanceReason,
          });
        });
      } catch (err) {
        console.error('Error fetching iOS research data:', err);
      }
      return iosResults;
    };

    const androidTask = async (): Promise<KeywordResult[]> => {
      if (platform !== 'android' && platform !== 'both') return [];
      const androidResults: KeywordResult[] = [];
      try {
        const [androidAutocomplete, aiExpansions] = await Promise.all([
          getAndroidAutocomplete(primarySeed, country),
          generateAiKeywordExpansions(primarySeed, 'android'),
        ]);

        const aiMap = new Map<string, AiKeywordSuggestion>();
        aiExpansions.forEach((a) => aiMap.set(a.keyword.toLowerCase().trim(), a));

        const combinedSet = new Set<string>();
        androidAutocomplete.forEach((k) => combinedSet.add(k.toLowerCase().trim()));
        aiExpansions.forEach((a) => combinedSet.add(a.keyword.toLowerCase().trim()));

        const targetList = Array.from(combinedSet).slice(0, 18);

        const androidSearchResults = await Promise.all(targetList.map((kw) => getAndroidSearchApps(kw, country)));

        androidSearchResults.forEach((searchApps, idx) => {
          const kw = targetList[idx];
          const demandScore = searchApps.estimatedDemandScore;
          const estAndroidVolume = convertAndroidDemandToVolume(demandScore);
          const difficulty = calculateKeywordDifficulty(kw, searchApps.apps, searchApps.totalResults);
          const relevanceObj = calculateRelevance(primarySeed, kw);
          const oppScore = calculateOpportunityScore(demandScore, difficulty, relevanceObj.score);

          const { apps: enrichedApps, breakdown } = computePlacementBreakdown(kw, searchApps.apps);
          const aiInfo = aiMap.get(kw.toLowerCase().trim());

          androidResults.push({
            id: `android-${kw.replace(/\s+/g, '-')}`,
            keyword: kw,
            platform: 'android',
            searchPopularity: demandScore,
            estimatedImpressions: estAndroidVolume,
            demandLabel: getDemandLabel(demandScore),
            difficulty,
            opportunityScore: oppScore,
            competingApps: searchApps.totalResults,
            relevance: relevanceObj.label,
            relevanceScore: relevanceObj.score,
            topApps: enrichedApps,
            isEstimatedVolume: true,
            dataQualityNote: 'Google Play Estimated Demand (modeled from store autocomplete & install brackets)',
            placementBreakdown: breakdown,
            isAiGenerated: !!aiInfo,
            aiRelevanceReason: aiInfo?.relevanceReason,
          });
        });
      } catch (err) {
        console.error('Error fetching Android research data:', err);
      }
      return androidResults;
    };

    // Execute iOS and Android pipelines in parallel for maximum speed
    const [iosRes, androidRes] = await Promise.all([iosTask(), androidTask()]);
    results.push(...iosRes, ...androidRes);

    // Sort initial results by Opportunity Score descending
    results.sort((a, b) => b.opportunityScore - a.opportunityScore);

    // Compute Summary Stats
    const totalKeywords = results.length;
    const highOpportunityCount = results.filter((r) => r.opportunityScore >= 70).length;
    const avgDifficulty = totalKeywords > 0 ? Math.round(results.reduce((acc, r) => acc + r.difficulty, 0) / totalKeywords) : 0;
    const topVolumeKeyword = results.length > 0 ? [...results].sort((a, b) => b.searchPopularity - a.searchPopularity)[0].keyword : primarySeed;

    const responsePayload: ResearchResponse = {
      seedKeyword: primarySeed,
      country,
      platform,
      totalKeywords,
      highOpportunityCount,
      avgDifficulty,
      topVolumeKeyword,
      results,
      extractedSeedKeywords: extractedSeeds,
      asaStatus: {
        configured: asaConfigured,
        authenticated: asaAuthenticated,
        message: asaMessage,
      },
      timestamp: new Date().toISOString(),
    };

    researchCache.set(cacheKey, responsePayload);
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error in /api/research endpoint:', error);
    return NextResponse.json({ error: error?.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
