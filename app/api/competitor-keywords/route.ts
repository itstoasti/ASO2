import { NextRequest, NextResponse } from 'next/server';
import { getIosSearchApps } from '@/lib/ios/app-store-search';
import { getAndroidSearchApps } from '@/lib/android/play-store-search';
import { estimateIosPopularityFallback } from '@/lib/ios/search-ads-api';
import { calculateKeywordDifficulty } from '@/lib/scoring/difficulty';
import { generateAiAsoKeywords, generateAiKeywordExpansions } from '@/lib/ai/keyword-generator';
import { DiscoveredCompetitorKeyword } from '@/lib/competitor-types';
import { CountryCode } from '@/lib/types';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetApp, competitor } = body;

    if (!competitor || !competitor.id) {
      return NextResponse.json({ error: 'competitor is required.' }, { status: 400 });
    }

    const platform = competitor.platform || 'ios';
    const country = (competitor.country || 'us') as CountryCode;
    const compName = competitor.name || 'Competitor';
    const compCategory = competitor.category || targetApp?.category || '';

    // 1. Generate high-intent mobile search phrases using AI & Store domain engine
    const candidateSet = new Set<string>();

    try {
      const aiSuggestions = await generateAiAsoKeywords(compName, competitor.developer, platform);
      aiSuggestions.forEach((s) => candidateSet.add(s.keyword.toLowerCase().trim()));
    } catch (e) {
      // ignore
    }

    // 2. Also expand for competitor category query
    if (compCategory && compCategory !== 'Apps') {
      try {
        const catExpansions = await generateAiKeywordExpansions(`${compCategory} app`, platform);
        catExpansions.forEach((s) => candidateSet.add(s.keyword.toLowerCase().trim()));
      } catch (e) {
        // ignore
      }
    }

    // 3. Add brand + app intent queries
    const brandWord = compName.split(/[:\-–—|]/)[0].toLowerCase().trim();
    if (brandWord.length >= 3) {
      candidateSet.add(`${brandWord} app`);
      candidateSet.add(`${brandWord} free`);
    }

    // Filter candidate list: must be meaningful mobile search queries (>= 2 words or strong branded term)
    const candidateList = Array.from(candidateSet)
      .filter((kw) => {
        const words = kw.trim().split(/\s+/);
        // Exclude single generic words
        if (words.length === 1 && ['app', 'free', 'pro', 'learn', 'recipes', 'cooking', 'workout', 'budget'].includes(words[0])) {
          return false;
        }
        return kw.length >= 3;
      })
      .slice(0, 25);

    const targetBrand = compName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)[0].trim();
    const cleanCompTitle = compName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const discovered: DiscoveredCompetitorKeyword[] = [];

    // Check live store ranks for all mobile search phrases
    const promises = candidateList.map(async (kw) => {
      try {
        let apps: any[] = [];
        let totalResults = 0;
        let searchPopularity = 30;

        if (platform === 'android') {
          const res = await getAndroidSearchApps(kw, country);
          apps = res.apps;
          totalResults = res.totalResults;
          searchPopularity = res.estimatedDemandScore || 35;
        } else {
          const res = await getIosSearchApps(kw, country);
          apps = res.apps;
          totalResults = res.totalResults;
          searchPopularity = estimateIosPopularityFallback(kw);
        }

        const difficulty = calculateKeywordDifficulty(kw, apps, totalResults);

        // Find competitor rank
        const matchIdx = apps.findIndex((a) => {
          const cleanA = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const idMatch = String(a.id).toLowerCase() === String(competitor.id).toLowerCase();
          const titleMatch = cleanA === cleanCompTitle || cleanA.includes(cleanCompTitle) || cleanCompTitle.includes(cleanA);
          const brandMatch = targetBrand.length >= 4 && cleanA.startsWith(targetBrand);
          return idMatch || titleMatch || brandMatch;
        });

        const compRank = matchIdx >= 0 ? matchIdx + 1 : null;

        // Source classification
        let source: 'title' | 'subtitle' | 'description' | 'organic_rank' = 'organic_rank';
        if (compName.toLowerCase().includes(kw)) {
          source = 'title';
        } else if (competitor.description && competitor.description.toLowerCase().includes(kw)) {
          source = 'description';
        }

        return {
          keyword: kw,
          searchPopularity,
          difficulty,
          source,
          competitorName: compName,
          competitorId: competitor.id,
          competitorRank: compRank,
        };
      } catch (e) {
        return null;
      }
    });

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r && r.competitorRank !== null && r.competitorRank !== undefined && r.competitorRank <= 50) {
        discovered.push(r);
      }
    }

    // Sort by best competitor ranking first, then search popularity
    discovered.sort((a, b) => {
      const rankA = a.competitorRank ?? 999;
      const rankB = b.competitorRank ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      return b.searchPopularity - a.searchPopularity;
    });

    return NextResponse.json({
      success: true,
      competitorId: competitor.id,
      totalDiscovered: discovered.length,
      discovered,
    });
  } catch (error: any) {
    console.error('Error in competitor-keywords API:', error);
    return NextResponse.json({ error: error?.message || 'Failed to extract competitor keywords.' }, { status: 500 });
  }
}
