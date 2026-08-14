import { NextRequest, NextResponse } from 'next/server';
import { getIosSearchApps } from '@/lib/ios/app-store-search';
import { getAndroidSearchApps } from '@/lib/android/play-store-search';
import { generateAiAsoKeywords } from '@/lib/ai/keyword-generator';
import { CountryCode, AppMetadata } from '@/lib/types';
import { CompetitorApp } from '@/lib/competitor-types';
import * as cheerio from 'cheerio';

export const revalidate = 0;

function cleanString(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Domain dictionary for niche semantic relevance matching
 */
function getDomainKeywords(targetName: string, category: string): string[] {
  const text = `${targetName} ${category}`.toLowerCase();
  
  if (text.includes('recipe') || text.includes('cook') || text.includes('meal') || text.includes('food') || text.includes('kitchen') || text.includes('bake') || text.includes('dining')) {
    return ['recipe', 'recipes', 'cook', 'cooking', 'meal', 'food', 'cookbook', 'kitchen', 'ingredient', 'planner', 'organizer', 'keeper', 'saver', 'dish', 'dishes', 'bake', 'baking', 'pantry', 'grocery', 'menu', 'dinner', 'lunch', 'eat', 'tasty', 'yum'];
  }
  if (text.includes('fit') || text.includes('workout') || text.includes('gym') || text.includes('exercise') || text.includes('calorie') || text.includes('health') || text.includes('training')) {
    return ['fit', 'fitness', 'workout', 'gym', 'exercise', 'training', 'calorie', 'muscle', 'health', 'tracker', 'log', 'run', 'running', 'lift', 'lifting', 'weight', 'cardio', 'reps', 'trainer'];
  }
  if (text.includes('language') || text.includes('spanish') || text.includes('french') || text.includes('german') || text.includes('lingo') || text.includes('learn') || text.includes('speak') || text.includes('english') || text.includes('japanese') || text.includes('korean')) {
    return ['language', 'learn', 'lesson', 'lessons', 'spanish', 'french', 'german', 'japanese', 'english', 'grammar', 'vocabulary', 'words', 'speak', 'fluency', 'tutor', 'course', 'lingo', 'fluency'];
  }
  if (text.includes('budget') || text.includes('money') || text.includes('finance') || text.includes('expense') || text.includes('spending')) {
    return ['budget', 'money', 'expense', 'finance', 'spending', 'tracker', 'wallet', 'savings', 'bills', 'income', 'cash', 'account', 'financial'];
  }
  if (text.includes('habit') || text.includes('routine') || text.includes('task') || text.includes('todo') || text.includes('journal') || text.includes('note') || text.includes('planner')) {
    return ['habit', 'routine', 'task', 'todo', 'notes', 'journal', 'planner', 'focus', 'timer', 'organizer', 'checklist', 'goals', 'daily'];
  }

  // Fallback: words from target title with length >= 4
  return targetName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['apps', 'free', 'best', 'with', 'your', 'from'].includes(w));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetApp } = body;

    if (!targetApp || !targetApp.id || !targetApp.name) {
      return NextResponse.json({ error: 'targetApp is required with id and name.' }, { status: 400 });
    }

    const platform = targetApp.platform || 'ios';
    const country = (targetApp.country || 'us') as CountryCode;
    const cleanTargetId = String(targetApp.id).toLowerCase().trim();
    const cleanTargetName = cleanString(targetApp.name);
    const domainKeywords = getDomainKeywords(targetApp.name, targetApp.category || '');

    // 1. Generate niche-focused search queries
    const baseQueries: string[] = [];

    // Extract multi-word feature phrases from title (skip 1-word brand tokens like "snap", "tap", "go")
    const titleParts = targetApp.name
      .replace(/[:\-–—|]/g, ',')
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);

    for (const part of titleParts) {
      const words = part.split(/\s+/).filter((w: string) => w.length > 2);
      if (words.length >= 2) {
        // Multi-word phrase like "Recipe Saver" or "Meal Planner"
        baseQueries.push(words.join(' '));
      }
    }

    // AI suggestions for high-intent competitor category terms (filtering out single-word brand queries)
    try {
      const aiTerms = await generateAiAsoKeywords(targetApp.name, targetApp.developer, platform);
      if (aiTerms && aiTerms.length > 0) {
        aiTerms.forEach((t) => {
          const kw = t.keyword.toLowerCase().trim();
          const words = kw.split(/\s+/);
          // Only use multi-word intent phrases or strong domain terms
          if (words.length >= 2 || domainKeywords.some((d) => kw.includes(d))) {
            baseQueries.push(kw);
          }
        });
      }
    } catch (e) {
      // ignore
    }

    // Add category query fallback
    if (targetApp.category && targetApp.category !== 'Apps') {
      baseQueries.push(`${targetApp.category} app`);
    }

    // Filter and deduplicate queries (capped to 5)
    const uniqueQueries = Array.from(new Set(baseQueries.filter(Boolean))).slice(0, 5);

    // 2. Query store search indexes in parallel
    const searchPromises = uniqueQueries.map(async (q) => {
      try {
        if (platform === 'android') {
          const res = await getAndroidSearchApps(q, country);
          return res.apps || [];
        } else {
          const res = await getIosSearchApps(q, country);
          return res.apps || [];
        }
      } catch (e) {
        return [];
      }
    });

    const queryResults = await Promise.all(searchPromises);

    // 3. Aggregate, score, and filter by Niche Relevance
    const candidateMap = new Map<string, { app: AppMetadata; score: number; appearances: number; domainMatches: number }>();

    for (const appList of queryResults) {
      appList.forEach((app, idx) => {
        const appId = String(app.id).toLowerCase();
        const appClean = cleanString(app.name);
        const appNameLower = app.name.toLowerCase();

        // Exclude target app itself
        if (appId === cleanTargetId || appClean === cleanTargetName || appClean.includes(cleanTargetName) || cleanTargetName.includes(appClean)) {
          return;
        }

        // Exclude developer's other apps if developer is distinctive
        if (targetApp.developer && targetApp.developer.length >= 4 && app.developer && app.developer.toLowerCase() === targetApp.developer.toLowerCase()) {
          return;
        }

        // Count how many domain keywords this candidate matches
        const domainMatches = domainKeywords.filter((dk) => appNameLower.includes(dk)).length;

        // CRITICAL NICHE FILTER: If the candidate has 0 domain matches in its name/category and only appeared once,
        // it is an unrelated app (like Snapchat for a recipe app) and must be discarded!
        if (domainKeywords.length > 0 && domainMatches === 0 && !appNameLower.includes(targetApp.category?.toLowerCase() || 'xyz123')) {
          return;
        }

        const rankScore = Math.max(1, 25 - idx);
        const domainScore = domainMatches * 30; // Strong bonus for direct domain match (e.g. "Recipe Keeper")
        const reviewScore = Math.min(10, Math.log10(Math.max(1, app.reviewCount || 100)) * 2);

        if (candidateMap.has(appId)) {
          const existing = candidateMap.get(appId)!;
          existing.score += rankScore + domainScore + 15; // Bonus for multi-query appearance
          existing.appearances += 1;
          existing.domainMatches = Math.max(existing.domainMatches, domainMatches);
        } else {
          candidateMap.set(appId, {
            app,
            score: rankScore + domainScore + reviewScore,
            appearances: 1,
            domainMatches,
          });
        }
      });
    }

    // 4. Sort strictly by domain relevance score descending
    const sortedCandidates = Array.from(candidateMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((c) => c.app);

    // 5. Enrich top competitors with full metadata, screenshots, and icons
    const enrichedCompetitors: CompetitorApp[] = [];

    if (platform === 'ios') {
      const topIds = sortedCandidates.slice(0, 8).map((a) => a.id).join(',');
      try {
        const lookupUrl = `https://itunes.apple.com/lookup?id=${topIds}&country=${country}`;
        const lookupRes = await fetch(lookupUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
          cache: 'no-store',
        });

        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          const items = lookupData.results || [];
          const itemMap = new Map<string, any>();
          items.forEach((item: any) => {
            const trackId = String(item.trackId || item.id);
            itemMap.set(trackId, item);
          });

          // Maintain exact relevance order from sortedCandidates
          for (const cand of sortedCandidates.slice(0, 8)) {
            const item = itemMap.get(cand.id);
            if (item) {
              const rawDesc = item.description || '';
              const screenshots: string[] = [];
              if (Array.isArray(item.screenshotUrls)) screenshots.push(...item.screenshotUrls);
              if (Array.isArray(item.ipadScreenshotUrls) && screenshots.length < 8) screenshots.push(...item.ipadScreenshotUrls);

              enrichedCompetitors.push({
                id: String(item.trackId || item.id),
                name: item.trackName || item.trackCensoredName || cand.name,
                developer: item.artistName || item.sellerName || cand.developer,
                iconUrl: item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60 || cand.iconUrl,
                platform: 'ios',
                country,
                rating: typeof item.averageUserRating === 'number' ? Math.round(item.averageUserRating * 10) / 10 : (cand.rating || 0),
                reviewCount: typeof item.userRatingCount === 'number' ? item.userRatingCount : (cand.reviewCount || 0),
                category: item.primaryGenreName || (item.genres && item.genres[0]) || targetApp.category || 'Apps',
                version: item.version || '1.0.0',
                updatedAt: item.currentVersionReleaseDate || item.releaseDate || '',
                description: rawDesc,
                releaseNotes: item.releaseNotes || '',
                screenshots,
                price: item.formattedPrice || (item.price === 0 ? 'Free' : `$${item.price}`),
                addedAt: new Date().toISOString(),
              });
            } else {
              enrichedCompetitors.push({
                id: cand.id,
                name: cand.name,
                developer: cand.developer,
                iconUrl: cand.iconUrl,
                platform: 'ios',
                country,
                rating: cand.rating || 0,
                reviewCount: cand.reviewCount || 0,
                category: targetApp.category || 'Apps',
                screenshots: [],
                description: '',
                addedAt: new Date().toISOString(),
              });
            }
          }
        }
      } catch (e) {
        console.error('iTunes batch lookup error in discover-competitors:', e);
      }
    } else if (platform === 'android') {
      const topCandidates = sortedCandidates.slice(0, 8);
      const androidPromises = topCandidates.map(async (cand) => {
        try {
          const storeUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(cand.id)}&hl=en&gl=${country}`;
          const res = await fetch(storeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            cache: 'no-store',
          });

          if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);

            let iconUrl = $('meta[property="og:image"]').attr('content') ||
                          $('meta[name="twitter:image"]').attr('content') ||
                          cand.iconUrl ||
                          '';
            if (!iconUrl) {
              const imgMatch = html.match(/https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_=-]+/i);
              if (imgMatch) iconUrl = imgMatch[0];
            }

            let name = $('meta[property="og:title"]').attr('content') ||
                       $('h1').first().text() ||
                       cand.name;
            name = name.replace(/ - Apps on Google Play$/i, '').replace(/ - Android Apps on Google Play$/i, '').trim();

            let developer = $('a[href*="/store/apps/developer"]').first().text().trim() ||
                            $('div.w8fizc').first().text().trim() ||
                            cand.developer ||
                            'Developer';

            let rating = cand.rating || 0;
            const ratingStr = $('div[itemprop="starRating"]').text() || $('div[aria-label*="stars"]').attr('aria-label') || '';
            const ratingMatch = ratingStr.match(/(\d+(\.\d+)?)/);
            if (ratingMatch) rating = parseFloat(ratingMatch[1]);

            let reviewCount = cand.reviewCount || 0;
            const reviewsFullMatch = html.match(/([\d.,]+[MK]?)\s*reviews/i);
            if (reviewsFullMatch) {
              const cleanR = reviewsFullMatch[1].toLowerCase().replace(/,/g, '').trim();
              if (cleanR.endsWith('m')) reviewCount = Math.round(parseFloat(cleanR) * 1000000);
              else if (cleanR.endsWith('k')) reviewCount = Math.round(parseFloat(cleanR) * 1000);
              else reviewCount = parseInt(cleanR, 10) || reviewCount;
            }

            const installsMatch = html.match(/([\d.,]+[MK]?\+?)\s*downloads/i);
            const installs = installsMatch ? installsMatch[1] : (cand.installs || '100K+');

            const category = $('a[itemprop="genre"]').text().trim() || targetApp.category || 'Food & Drink';
            
            let description = '';
            const descEl = $('div[data-g-id="description"], div.bARER').first();
            if (descEl.length > 0) {
              descEl.find('br').replaceWith('\n');
              descEl.find('p').each((_, p) => { $(p).append('\n\n'); });
              descEl.find('li').each((_, li) => { $(li).prepend('• ').append('\n'); });
              description = descEl.text().trim();
            }
            if (!description) {
              description = $('meta[name="description"]').attr('content') || '';
            }

            const screenshots: string[] = [];
            const seenScreenshots = new Set<string>();

            // Extract Google Play screenshots
            $('img[alt*="Screenshot" i], img[alt*="screenshot" i], .Atcj9b img, div[data-screenshot-index] img').each((_, el) => {
              let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('srcset');
              if (src) {
                src = src.split(' ')[0].trim();
                if (src.includes('googleusercontent.com') && !src.includes('profile_icon') && src !== iconUrl) {
                  if (!seenScreenshots.has(src)) {
                    seenScreenshots.add(src);
                    screenshots.push(src);
                  }
                }
              }
            });

            // Fallback: only if explicit selector returned 0
            if (screenshots.length === 0) {
              $('img[src*="play-lh.googleusercontent.com"]').each((_, el) => {
                const alt = $(el).attr('alt') || '';
                const parentClass = $(el).parent().attr('class') || '';
                if (alt.includes('Icon') || alt.includes('rating') || parentClass.includes('wGcURe')) {
                  return;
                }
                let src = $(el).attr('src') || $(el).attr('data-src');
                if (src && src !== iconUrl) {
                  src = src.split(' ')[0].trim();
                  if (!seenScreenshots.has(src)) {
                    seenScreenshots.add(src);
                    screenshots.push(src);
                  }
                }
              });
            }

            return {
              id: cand.id,
              name,
              developer,
              iconUrl,
              platform: 'android' as const,
              country,
              rating: Math.round(rating * 10) / 10,
              reviewCount,
              installs,
              category,
              version: '1.0.0',
              description,
              screenshots: screenshots.slice(0, 8),
              price: 'Free',
              addedAt: new Date().toISOString(),
            };
          }
        } catch (e) {
          // fallback to cand
        }

        return {
          id: cand.id,
          name: cand.name,
          developer: cand.developer,
          iconUrl: cand.iconUrl,
          platform: 'android' as const,
          country,
          rating: cand.rating || 0,
          reviewCount: cand.reviewCount || 0,
          installs: cand.installs,
          category: targetApp.category || 'Food & Drink',
          screenshots: [],
          description: '',
          addedAt: new Date().toISOString(),
        };
      });

      const androidResults = await Promise.all(androidPromises);
      enrichedCompetitors.push(...androidResults);
    }

    // Fallback if empty
    if (enrichedCompetitors.length === 0) {
      for (const cand of sortedCandidates.slice(0, 8)) {
        enrichedCompetitors.push({
          id: cand.id,
          name: cand.name,
          developer: cand.developer,
          iconUrl: cand.iconUrl,
          platform,
          country,
          rating: cand.rating || 0,
          reviewCount: cand.reviewCount || 0,
          installs: cand.installs,
          category: targetApp.category || 'Apps',
          screenshots: [],
          description: '',
          addedAt: new Date().toISOString(),
        });
      }
    }

    const finalCompetitors = enrichedCompetitors.slice(0, 8);

    return NextResponse.json({
      success: true,
      targetAppId: targetApp.id,
      totalDiscovered: finalCompetitors.length,
      competitors: finalCompetitors,
    });
  } catch (error: any) {
    console.error('Error in discover-competitors API:', error);
    return NextResponse.json({ error: error?.message || 'Failed to auto-discover competitors.' }, { status: 500 });
  }
}
