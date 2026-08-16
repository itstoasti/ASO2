import { NextRequest, NextResponse } from 'next/server';
import { getIosSearchApps } from '@/lib/ios/app-store-search';
import { getAndroidSearchApps } from '@/lib/android/play-store-search';
import { getOfficialAsaPopularity } from '@/lib/ios/search-ads-api';
import { calculateKeywordDifficulty } from '@/lib/scoring/difficulty';
import { generateAiAsoKeywords } from '@/lib/ai/keyword-generator';

export const revalidate = 0;

export interface DiscoveredKeyword {
  keyword: string;
  rank: number;
  searchPopularity: number;
  difficulty: number;
  competingApps: number;
  category: 'gem' | 'striking' | 'opportunity';
  platform: 'ios' | 'android';
  relevanceReason?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appId, platform, country = 'us', appName, developer } = body;

    if (!appId || !platform || !appName) {
      return NextResponse.json({ error: 'Missing required parameters: appId, platform, appName' }, { status: 400 });
    }

    // 1. Generate AI-powered relevant ASO keywords
    const aiSuggestions = await generateAiAsoKeywords(appName, developer, platform);
    const candidateKeywords = new Set<string>(aiSuggestions.map((s) => s.keyword));

    const keywordList = Array.from(candidateKeywords).slice(0, 40);
    const targetBrand = appName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)[0].trim();
    const cleanTargetTitle = appName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Pre-fetch Apple search popularity in batch if platform is iOS
    let iosAsaMap = new Map<string, { popularity: number; isOfficial: boolean }>();
    if (platform === 'ios') {
      try {
        iosAsaMap = await getOfficialAsaPopularity(keywordList, null, country);
      } catch (err) {
        // fallback
      }
    }

    // 2. Parallel live store rank checking with STRICT non-false matching
    const checkPromises = keywordList.map(async (kw) => {
      try {
        const aiInfo = aiSuggestions.find((s) => s.keyword === kw);

        if (platform === 'ios') {
          const searchRes = await getIosSearchApps(kw, country);
          const foundIdx = searchRes.apps.findIndex((a) => {
            const cleanA = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const idMatch = String(a.id).toLowerCase() === String(appId).toLowerCase();
            const exactTitle = cleanA === cleanTargetTitle;
            const startsWithBrand = targetBrand.length >= 5 && cleanA.startsWith(targetBrand);
            return idMatch || exactTitle || startsWithBrand;
          });

          if (foundIdx !== -1) {
            const rank = foundIdx + 1;
            const popData = iosAsaMap.get(kw.toLowerCase().trim());
            const searchPopularity = popData ? popData.popularity : 30;
            const difficulty = calculateKeywordDifficulty(kw, searchRes.apps, searchRes.totalResults);
            const category: 'gem' | 'striking' | 'opportunity' = rank <= 10 ? 'gem' : rank <= 30 ? 'striking' : 'opportunity';

            return {
              keyword: kw,
              rank,
              searchPopularity,
              difficulty,
              competingApps: searchRes.totalResults,
              category,
              platform: 'ios' as const,
              relevanceReason: aiInfo?.relevanceReason,
            };
          }
        } else {
          const searchRes = await getAndroidSearchApps(kw, country);
          const foundIdx = searchRes.apps.findIndex((a) => {
            const cleanA = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const idMatch = a.id.toLowerCase() === appId.toLowerCase();
            const exactTitle = cleanA === cleanTargetTitle;
            const startsWithBrand = targetBrand.length >= 5 && cleanA.startsWith(targetBrand);
            return idMatch || exactTitle || startsWithBrand;
          });

          if (foundIdx !== -1) {
            const rank = foundIdx + 1;
            const searchPopularity = searchRes.estimatedDemandScore || 25;
            const difficulty = calculateKeywordDifficulty(kw, searchRes.apps, searchRes.totalResults);
            const category: 'gem' | 'striking' | 'opportunity' = rank <= 10 ? 'gem' : rank <= 30 ? 'striking' : 'opportunity';

            return {
              keyword: kw,
              rank,
              searchPopularity,
              difficulty,
              competingApps: searchRes.totalResults,
              category,
              platform: 'android' as const,
              relevanceReason: aiInfo?.relevanceReason,
            };
          }
        }
      } catch (err) {
        console.warn(`Rank check failed for "${kw}":`, err);
      }
      return null;
    });

    const results = await Promise.all(checkPromises);
    const discovered: DiscoveredKeyword[] = results.filter((r): r is NonNullable<typeof r> => r !== null);

    // Sort by rank position ascending (#1 rank first)
    discovered.sort((a, b) => a.rank - b.rank);

    return NextResponse.json({
      success: true,
      appId,
      platform,
      totalDiscovered: discovered.length,
      discovered,
    });
  } catch (error: any) {
    console.error('Error in auto-detect-keywords endpoint:', error);
    return NextResponse.json({ error: error?.message || 'Failed to auto-detect keywords.' }, { status: 500 });
  }
}
