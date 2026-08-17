import { CountryCode, COUNTRIES } from '../types';

// Web content words and gaming/template tokens to exclude non-app search queries
const NON_APP_WEB_TERMS = new Set([
  'potion', 'powder', 'sheets', 'excel', 'pickles', 'coleslaw', 'waffles', 'meatloaf', 'banana', 'bread', 'chicken',
  'cookies', 'pie', 'jam', 'strawberries', 'potatoes', 'beef', 'turkey', 'cake',
  'soup', 'salad', 'smoothie', 'pasta', 'sauce', 'steak', 'pork', 'shrimp', 'salmon',
  'tacos', 'pizza', 'curry', 'brownies', 'muffins', 'ribs', 'chili', 'pancakes',
  'freezer', 'dip', 'sauces', 'dressing', 'casserole', 'stew', 'baking', 'roast',
  'fried', 'grilled', 'biscuit', 'syrup', 'gravy', 'near me', 'wiki', 'pdf', 'video', 'pc',
  // Gaming companion / Mod / Template tokens that contaminate generic app intent
  'stardew', 'palia', 'notion', 'minecraft', 'roblox', 'genshin', 'valheim', 'terraria',
  'template', 'templates', 'spreadsheet', 'spreadsheets', 'crafting', 'mod', 'mods',
  'guide', 'addon', 'addons', 'cheat', 'cheats', 'switch', 'ps4', 'ps5', 'xbox'
]);

function decodeAndSanitize(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[><\^\|\\\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAppStoreSearchKeyword(term: string): boolean {
  if (!term || typeof term !== 'string') return false;
  const clean = decodeAndSanitize(term).toLowerCase();

  if (clean.length < 3 || clean.length > 50) return false;
  if (/\s[a-z]$/.test(clean)) return false;

  // Exclude URLs, system metadata, symbols
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.includes('google.com') ||
    clean.includes('?') ||
    clean.includes('=') ||
    clean.includes('&') ||
    clean.includes('<') ||
    clean.includes('>')
  ) {
    return false;
  }

  // Reject duplicate consecutive words (e.g. "recipe recipe")
  const words = clean.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1]) return false;
  }

  // Exclude web informational question prefixes
  if (
    clean.startsWith('how to') ||
    clean.startsWith('what is') ||
    clean.startsWith('why do') ||
    clean.startsWith('where to') ||
    clean.startsWith('recipes with')
  ) {
    return false;
  }

  // Check against web & game content exclusion list
  if (words.some((w) => NON_APP_WEB_TERMS.has(w))) {
    return false;
  }

  return /^[a-z0-9\s\-\.\'\"]+$/.test(clean);
}

/**
 * Android App Store Autocomplete - High-Intent Play Store Search Intelligence
 */
export async function getAndroidAutocomplete(keyword: string, country: CountryCode = 'us'): Promise<string[]> {
  const seedClean = decodeAndSanitize(keyword).toLowerCase();
  const suggestions = new Set<string>();

  if (isAppStoreSearchKeyword(seedClean)) {
    suggestions.add(seedClean);
  }

  // 1. Fetch Real Live Consumer Search Queries with app modifier context
  try {
    const queriesToFetch = [
      `${seedClean} app`,
      `${seedClean} android`,
      `${seedClean} tracker`,
      `${seedClean} planner`,
      `${seedClean} free`,
      seedClean,
    ];

    const fetchPromises = queriesToFetch.map(async (q) => {
      const searchUrl = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data[1])) {
          data[1].forEach((term: string) => {
            const clean = decodeAndSanitize(term).toLowerCase();
            if (isAppStoreSearchKeyword(clean)) {
              suggestions.add(clean);
            }
          });
        }
      }
    });

    await Promise.all(fetchPromises);
  } catch (e) {
    console.error('Play Store suggest fetch err:', e);
  }

  // 2. Extract Title & Subtitle Keywords directly from top ranking Play Store apps
  try {
    const store = COUNTRIES.find((c) => c.code === country)?.code || 'us';
    const url = `https://play.google.com/store/search?q=${encodeURIComponent(keyword)}&c=apps&hl=en&gl=${store}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const html = await res.text();
      const titleMatches = Array.from(html.matchAll(/class="DdV5ec"><div class="v2bFdf[^"]*">([^<]+)<\/div>/g));

      titleMatches.forEach((m) => {
        const rawName = decodeAndSanitize(m[1]).toLowerCase();
        const cleanName = rawName.replace(/[:\-\,\(\)\.\+\&\/]/g, ' ').replace(/\s+/g, ' ').trim();

        const words = cleanName.split(' ');
        for (let len = 2; len <= 3; len++) {
          for (let i = 0; i <= words.length - len; i++) {
            const phrase = words.slice(i, i + len).join(' ');
            if (phrase.includes(seedClean) && isAppStoreSearchKeyword(phrase)) {
              suggestions.add(phrase);
            }
          }
        }
      });
    }
  } catch (e) {
    // silent catch
  }

  return Array.from(suggestions).filter(isAppStoreSearchKeyword).slice(0, 30);
}
