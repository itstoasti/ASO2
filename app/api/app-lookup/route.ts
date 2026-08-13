import { NextRequest, NextResponse } from 'next/server';

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
            return NextResponse.json({
              id: item.trackId ? item.trackId.toString() : cleanInput,
              name: decodeHtml(item.trackName || item.trackCensoredName || cleanInput),
              developer: decodeHtml(item.artistName || 'Developer'),
              iconUrl: item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60,
              platform: 'ios',
              country,
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
      console.log('[API APP LOOKUP] Fetching Play Store URL:', storeUrl);
      const response = await fetch(storeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        cache: 'no-store',
      });

      console.log('[API APP LOOKUP] Play Store Status:', response.status);

      if (response.ok) {
        const html = await response.text();
        console.log('[API APP LOOKUP] HTML Length:', html.length);

        // 1. Extract App Title
        let name = '';
        const titleMatch =
          html.match(/name="twitter:title"\s+content="([^"]+)"/i) ||
          html.match(/property="og:title"\s+content="([^"]+)"/i) ||
          html.match(/content="([^"]+)"\s+name="twitter:title"/i) ||
          html.match(/content="([^"]+)"\s+property="og:title"/i) ||
          html.match(/<title>([^<]+)<\/title>/i);

        if (titleMatch) {
          name = titleMatch[1].replace(/ - Apps on Google Play$/i, '').replace(/ - Android Apps on Google Play$/i, '').trim();
        }
        console.log('[API APP LOOKUP] Extracted Name:', name);

        // 2. Extract App Icon Artwork URL
        let iconUrl = '';
        const imgMatch =
          html.match(/property="og:image"\s+content="([^"]+)"/i) ||
          html.match(/content="([^"]+)"\s+property="og:image"/i) ||
          html.match(/name="twitter:image"\s+content="([^"]+)"/i) ||
          html.match(/content="([^"]+)"\s+name="twitter:image"/i);

        if (imgMatch) {
          iconUrl = imgMatch[1];
        } else {
          const googleImgMatch = html.match(/https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_=-]+/i);
          if (googleImgMatch) iconUrl = googleImgMatch[0];
        }
        console.log('[API APP LOOKUP] Extracted Icon URL:', iconUrl);

        // 3. Extract Developer Name
        let developer = '';
        const devMatch =
          html.match(/href="\/store\/apps\/developer\?id=[^"]+"><span>([^<]+)<\/span>/i) ||
          html.match(/href="\/store\/apps\/dev\?id=[^"]+"><span>([^<]+)<\/span>/i) ||
          html.match(/class="w8fizc">([^<]+)<\/span>/i) ||
          html.match(/name="author"\s+content="([^"]+)"/i);

        if (devMatch) {
          developer = devMatch[1].trim();
        }
        console.log('[API APP LOOKUP] Extracted Developer:', developer);

        if (name && name !== pkgId) {
          const cleanName = decodeHtml(name);
          const cleanDev = decodeHtml(developer || 'Android Developer');
          return NextResponse.json({
            id: pkgId,
            name: cleanName,
            developer: cleanDev,
            iconUrl: iconUrl || undefined,
            platform: 'android',
            country,
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
    });
  } catch (error) {
    console.error('App lookup failed:', error);
    return NextResponse.json({ error: 'App lookup failed' }, { status: 500 });
  }
}
