import { NextRequest, NextResponse } from 'next/server';
import { getIosSearchApps } from '@/lib/ios/app-store-search';
import { getAndroidSearchApps } from '@/lib/android/play-store-search';
import { estimateIosPopularityFallback } from '@/lib/ios/search-ads-api';
import { calculateKeywordDifficulty } from '@/lib/scoring/difficulty';
import { CountryCode } from '@/lib/types';
import { CompetitorKeywordMatrixRow, CompetitorRankCheck } from '@/lib/competitor-types';

export const revalidate = 0;

function matchAppRank(appId: string, appName: string, apps: any[]): number | null {
  const cleanId = String(appId || '').toLowerCase().trim();
  const cleanName = (appName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetBrand = (appName || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)[0].trim();

  const foundIndex = apps.findIndex((a) => {
    const cleanAppId = String(a.id || '').toLowerCase().trim();
    const cleanAppName = (a.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Direct ID match
    if (cleanId && (cleanAppId === cleanId || cleanAppId.includes(cleanId) || cleanId.includes(cleanAppId))) {
      return true;
    }

    // 2. Exact or high-confidence title match
    if (cleanName && cleanAppName && (cleanAppName === cleanName || cleanAppName.includes(cleanName) || cleanName.includes(cleanAppName))) {
      return true;
    }

    // 3. Brand match if distinctive (>= 4 chars)
    if (targetBrand.length >= 4 && cleanAppName.startsWith(targetBrand)) {
      return true;
    }

    return false;
  });

  return foundIndex >= 0 ? foundIndex + 1 : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetApp, competitors = [], keywords = [] } = body;

    if (!targetApp || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: 'targetApp and keywords are required.' }, { status: 400 });
    }

    const platform = targetApp.platform || 'ios';
    const country = (targetApp.country || 'us') as CountryCode;

    const matrix: CompetitorKeywordMatrixRow[] = [];

    // Process keywords concurrently with chunks to prevent rate limiting
    const chunkSize = 5;
    for (let i = 0; i < keywords.length; i += chunkSize) {
      const chunk = keywords.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (kw: string) => {
        const cleanKeyword = kw.trim();
        if (!cleanKeyword) return null;

        try {
          let apps: any[] = [];
          let totalResults = 0;
          let searchPopularity = 30;

          if (platform === 'android') {
            const res = await getAndroidSearchApps(cleanKeyword, country);
            apps = res.apps;
            totalResults = res.totalResults;
            searchPopularity = res.estimatedDemandScore || 35;
          } else {
            const res = await getIosSearchApps(cleanKeyword, country);
            apps = res.apps;
            totalResults = res.totalResults;
            searchPopularity = estimateIosPopularityFallback(cleanKeyword);
          }

          const difficulty = calculateKeywordDifficulty(cleanKeyword, apps, totalResults);

          // Find target app's rank
          const myRank = matchAppRank(targetApp.id, targetApp.name, apps);

          // Find each competitor's rank
          const competitorRanks: CompetitorRankCheck[] = (competitors as any[]).map((comp) => {
            const compRank = matchAppRank(comp.id, comp.name, apps);
            return {
              competitorId: comp.id,
              name: comp.name,
              iconUrl: comp.iconUrl,
              rank: compRank,
            };
          });

          // Metrics calculation
          let outrankingCount = 0;
          let isOpportunityGap = false;
          let isBattleground = false;

          for (const cr of competitorRanks) {
            if (cr.rank !== null) {
              // If competitor is Top 10 and my app is > 20 or not ranked
              if (cr.rank <= 10 && (myRank === null || myRank > 20)) {
                isOpportunityGap = true;
              }

              // If both my app and competitor are Top 10
              if (myRank !== null && myRank <= 10 && cr.rank <= 10) {
                isBattleground = true;
              }

              // Did my app beat this competitor?
              if (myRank !== null && (cr.rank === null || myRank < cr.rank)) {
                outrankingCount++;
              }
            } else if (myRank !== null) {
              outrankingCount++;
            }
          }

          const isWinning = myRank !== null && (myRank <= 3 || outrankingCount === competitorRanks.length);

          const row: CompetitorKeywordMatrixRow = {
            keyword: cleanKeyword,
            searchPopularity,
            difficulty,
            competingApps: totalResults,
            myRank,
            competitorRanks,
            outrankingCount,
            isOpportunityGap,
            isWinning,
            isBattleground,
          };

          return row;
        } catch (err) {
          console.warn(`Competitor matrix failed for "${cleanKeyword}":`, err);
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const res of chunkResults) {
        if (res) matrix.push(res);
      }
    }

    return NextResponse.json({
      success: true,
      targetAppId: targetApp.id,
      totalKeywords: matrix.length,
      matrix,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in competitor-matrix API:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate competitor matrix.' }, { status: 500 });
  }
}
