import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { appId, platform, country = 'us' } = await req.json();

    if (!appId || typeof appId !== 'string') {
      return NextResponse.json({ error: 'appId parameter is required' }, { status: 400 });
    }

    const cleanInput = appId.trim();

    // Auto-detect platform if cleanInput is an Android package or Play Store link
    const isAndroidPackage = cleanInput.includes('play.google.com') || /^[a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+$/.test(cleanInput);
    const effectivePlatform = isAndroidPackage ? 'android' : (platform || (/^\d+$/.test(cleanInput) ? 'ios' : 'ios'));

    // 1. iOS App Lookup via iTunes Search/Lookup API
    if (effectivePlatform === 'ios') {
      const isNumeric = /^\d+$/.test(cleanInput);
      const url = isNumeric
        ? `https://itunes.apple.com/lookup?id=${cleanInput}&country=${country}`
        : `https://itunes.apple.com/search?term=${encodeURIComponent(cleanInput)}&entity=software&country=${country}&limit=1`;

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const item = data.results[0];

            // Collect all available high-res screenshot URLs (iPhone + iPad)
            const screenshots: string[] = [];
            if (Array.isArray(item.screenshotUrls)) {
              screenshots.push(...item.screenshotUrls);
            }
            if (Array.isArray(item.ipadScreenshotUrls) && screenshots.length < 10) {
              screenshots.push(...item.ipadScreenshotUrls);
            }

            // Extract primary subtitle or artist/seller details
            const rawDescription = item.description || '';
            const rating = typeof item.averageUserRating === 'number' 
              ? Math.round(item.averageUserRating * 10) / 10 
              : 0;
            const reviewCount = typeof item.userRatingCount === 'number' ? item.userRatingCount : 0;
            const category = item.primaryGenreName || (item.genres && item.genres[0]) || 'Apps';
            const version = item.version || '1.0.0';
            const updatedAt = item.currentVersionReleaseDate || item.releaseDate || '';
            const releaseNotes = item.releaseNotes || '';
            const price = item.formattedPrice || (item.price === 0 ? 'Free' : `$${item.price}`);

            return NextResponse.json({
              id: item.trackId ? item.trackId.toString() : cleanInput,
              name: decodeHtml(item.trackName || item.trackCensoredName || cleanInput),
              developer: decodeHtml(item.artistName || item.sellerName || 'Developer'),
              iconUrl: item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60,
              platform: 'ios',
              country,
              rating,
              reviewCount,
              category,
              version,
              updatedAt,
              description: rawDescription,
              releaseNotes,
              screenshots,
              price,
            });
          }
        }
      } catch (e) {
        console.error('iTunes API lookup error:', e);
      }
    }

    // 2. Google Play Store Lookup
    let pkgId = cleanInput;
    if (cleanInput.includes('play.google.com')) {
      try {
        const u = new URL(cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`);
        pkgId = u.searchParams.get('id') || cleanInput;
      } catch {
        // ignore
      }
    }

    const storeUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkgId)}&hl=en&gl=${country}`;

    try {
      const response = await fetch(storeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. Extract App Title
        let name = $('meta[name="twitter:title"]').attr('content') ||
                   $('meta[property="og:title"]').attr('content') ||
                   $('h1').first().text() ||
                   $('title').text();
        name = name.replace(/ - Apps on Google Play$/i, '').replace(/ - Android Apps on Google Play$/i, '').trim();

        // 2. Extract App Icon Artwork URL
        let iconUrl = $('meta[property="og:image"]').attr('content') ||
                      $('meta[name="twitter:image"]').attr('content') ||
                      '';
        if (!iconUrl) {
          const imgMatch = html.match(/https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_=-]+/i);
          if (imgMatch) iconUrl = imgMatch[0];
        }

        // 3. Extract Developer Name
        let developer = $('a[href*="/store/apps/developer"]').first().text().trim() ||
                        $('a[href*="/store/apps/dev"]').first().text().trim() ||
                        $('div.w8fizc').first().text().trim() ||
                        $('meta[name="author"]').attr('content') ||
                        'Android Developer';

        // 4. Extract Rating & Review Count & Installs via Google Play Badges
        let rating = 0;
        let reviewCount = 0;
        let installs = '';

        $('div.wVqUob').each((_, el) => {
          const text = $(el).text();
          const val = $(el).find('div.ClM7O').text().trim();
          const label = $(el).find('div.g1Rdde').text().trim();

          if (/download|installs/i.test(text)) {
            installs = val || text.replace(/downloads?/i, '').trim();
          } else if (/review/i.test(text)) {
            const rMatch = val.match(/(\d+(\.\d+)?)/);
            if (rMatch) rating = parseFloat(rMatch[1]);
            const revText = (label || text).replace(/,/g, '');
            const revMatch = revText.match(/([\d.]+[MK]?)\s*reviews?/i);
            if (revMatch) {
              const clean = revMatch[1].toLowerCase();
              if (clean.endsWith('m')) reviewCount = Math.round(parseFloat(clean) * 1000000);
              else if (clean.endsWith('k')) reviewCount = Math.round(parseFloat(clean) * 1000);
              else reviewCount = parseInt(clean, 10) || 0;
            }
          }
        });

        // Fallback for rating if not found above
        if (!rating) {
          const ratingStr = $('div[itemprop="starRating"]').text() || $('div.TT9eCd').first().text() || $('div[aria-label*="stars"]').attr('aria-label') || '';
          const ratingMatch = ratingStr.match(/(\d+(\.\d+)?)/);
          if (ratingMatch) rating = parseFloat(ratingMatch[1]);
        }

        // Fallback for installs if not found above
        if (!installs || installs.includes('star')) {
          const installMatch = html.match(/([\d.,]+[MK]?\+?)\s*(downloads|installs)/i) || html.match(/"\s*([\d,]+[MK]?\+)\s*downloads/i);
          if (installMatch) installs = installMatch[1].trim();
          else installs = '100K+';
        }

        // 6. Extract Category / Genre
        let category = 'Food & Drink';
        const categoryLinks = $('a[href*="/store/apps/category/"]').map((_, el) => $(el).text().trim()).get().filter(Boolean);
        const validCat = categoryLinks.find((c) => c !== 'Kids' && c !== 'Family');
        if (validCat) {
          category = validCat;
        } else if (categoryLinks.length > 0) {
          category = categoryLinks[0];
        }

        // 7. Extract Description
        let description = '';
        const descEl = $('div[data-g-id="description"], div.bARER').first();
        if (descEl.length > 0) {
          descEl.find('br').replaceWith('\n');
          descEl.find('p').each((_, p) => { $(p).append('\n\n'); });
          descEl.find('li').each((_, li) => { $(li).prepend('• ').append('\n'); });
          description = descEl.text().trim();
        }
        if (!description) {
          description = $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || 
                        '';
        }

        // 8. Extract Screenshots
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

        if (name && name !== pkgId) {
          return NextResponse.json({
            id: pkgId,
            name: decodeHtml(name),
            developer: decodeHtml(developer),
            iconUrl: iconUrl || undefined,
            platform: 'android',
            country,
            rating,
            reviewCount,
            installs,
            category,
            description,
            screenshots: screenshots.slice(0, 8),
          });
        }
      }
    } catch (err) {
      console.error('[API APP LOOKUP] Failed fetching Play Store details:', err);
    }

    const parts = pkgId.split('.');
    let name = pkgId;
    let developer = 'Android Developer';

    const genericWords = new Set(['app', 'mobile', 'android', 'free', 'pro', 'lite', 'official']);

    if (parts.length >= 3) {
      let rawAppName = parts[parts.length - 1];
      let rawDevName = parts[1];

      if (genericWords.has(rawAppName.toLowerCase()) && parts.length >= 3) {
        rawAppName = parts[parts.length - 2];
      }

      name = rawAppName.charAt(0).toUpperCase() + rawAppName.slice(1);
      developer = rawDevName.charAt(0).toUpperCase() + rawDevName.slice(1);
    } else if (parts.length === 2) {
      const rawAppName = parts[1];
      name = rawAppName.charAt(0).toUpperCase() + rawAppName.slice(1);
      developer = name;
    }

    return NextResponse.json({
      id: pkgId,
      name: decodeHtml(name),
      developer: decodeHtml(developer),
      platform: 'android',
      country,
      rating: 0,
      reviewCount: 0,
      description: '',
      screenshots: [],
    });
  } catch (error) {
    console.error('App lookup failed:', error);
    return NextResponse.json({ error: 'App lookup failed' }, { status: 500 });
  }
}
