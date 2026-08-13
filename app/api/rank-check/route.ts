import { NextRequest, NextResponse } from 'next/server';
import { getIosSearchApps } from '@/lib/ios/app-store-search';
import { getAndroidSearchApps } from '@/lib/android/play-store-search';
import { estimateIosPopularityFallback } from '@/lib/ios/search-ads-api';
import { calculateKeywordDifficulty } from '@/lib/scoring/difficulty';
import { CountryCode, Platform } from '@/lib/types';
import { RankCheckResult } from '@/lib/rank-tracker-types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appId, keywords, platform = 'ios', country = 'us' } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required.' },
        { status: 400 }
      );
    }

    const cleanAppId = (appId || '').toLowerCase().trim();
    const results: RankCheckResult[] = [];

    for (const kw of keywords) {
      const cleanKeyword = kw.trim();
      if (!cleanKeyword) continue;

      let apps: any[] = [];
      let totalResults = 0;

      let searchPopularity = 30;
      if (platform === 'android') {
        const res = await getAndroidSearchApps(cleanKeyword, country as CountryCode);
        apps = res.apps;
        totalResults = res.totalResults;
        searchPopularity = res.estimatedDemandScore || 40;
      } else {
        const res = await getIosSearchApps(cleanKeyword, country as CountryCode);
        apps = res.apps;
        totalResults = res.totalResults;
        searchPopularity = estimateIosPopularityFallback(cleanKeyword);
      }

      // Calculate rank position (1-50)
      let foundRank: number | null = null;
      if (cleanAppId) {
        const matchIndex = apps.findIndex((app) => {
          const idMatch = String(app.id).toLowerCase() === cleanAppId;
          const nameMatch = app.name.toLowerCase().includes(cleanAppId);
          const devMatch = app.developer.toLowerCase().includes(cleanAppId);
          return idMatch || nameMatch || devMatch;
        });

        if (matchIndex >= 0) {
          foundRank = matchIndex + 1;
        }
      }

      // Calculate difficulty baseline for the keyword
      const difficulty = calculateKeywordDifficulty(cleanKeyword, apps, totalResults);

      results.push({
        keyword: cleanKeyword,
        rank: foundRank,
        searchPopularity,
        difficulty,
        competingApps: totalResults,
        top3Competitors: apps.slice(0, 3),
      });
    }

    return NextResponse.json({
      appId,
      platform,
      country,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in rank-check API:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check keyword ranks.' },
      { status: 500 }
    );
  }
}
