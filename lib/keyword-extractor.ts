import * as cheerio from 'cheerio';

/**
 * Extracts candidate seed keywords from a target Website URL or App Store/Play Store link
 */
export async function extractSeedKeywordsFromUrl(targetUrl: string): Promise<string[]> {
  const keywords = new Set<string>();

  try {
    let normalizedUrl = targetUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return Array.from(keywords);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract page title
    const title = $('title').text() || $('h1').first().text() || '';
    cleanAndAddKeywords(title, keywords);

    // Extract meta keywords & description
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    if (metaKeywords) {
      metaKeywords.split(',').forEach((kw) => {
        const clean = kw.trim().toLowerCase();
        if (clean.length > 2 && clean.length < 30) {
          keywords.add(clean);
        }
      });
    }

    const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    cleanAndAddKeywords(metaDesc, keywords);

    // Extract H1 / H2 headings
    $('h1, h2').each((_, el) => {
      cleanAndAddKeywords($(el).text(), keywords);
    });
  } catch (error) {
    console.error('Error extracting seed keywords from URL:', error);
  }

  return Array.from(keywords).slice(0, 10);
}

function cleanAndAddKeywords(text: string, set: Set<string>): void {
  if (!text) return;
  const stopwords = new Set(['the', 'and', 'for', 'with', 'your', 'app', 'online', 'best', 'free', 'get', 'how', 'this', 'that', 'from', 'have', 'more']);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));

  // Single word seeds
  words.slice(0, 8).forEach((w) => set.add(w));

  // Two-word bigrams
  for (let i = 0; i < words.length - 1 && set.size < 12; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    set.add(bigram);
  }
}
