import { CountryCode, COUNTRIES } from '../types';

function isValidAppStoreKeyword(term: string): boolean {
  if (!term || typeof term !== 'string') return false;
  const clean = term.trim().toLowerCase();

  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.includes('search.itunes.apple.com') ||
    clean.includes('mzsearchhints') ||
    clean.includes('mzstore') ||
    clean.includes('webobjects') ||
    clean.includes('?') ||
    clean.includes('=') ||
    clean.includes('&') ||
    clean.includes('<') ||
    clean.includes('>')
  ) {
    return false;
  }

  // Reject single dangling letters at the end
  if (/\s[a-z]$/.test(clean)) {
    return false;
  }

  // Reject duplicate consecutive words (e.g. "recipe recipe saver")
  const words = clean.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1]) return false;
  }

  // Reject synthetic single-character or overly long strings
  if (clean.length < 3 || clean.length > 45) return false;
  if (words.length > 5) return false;

  const systemWords = new Set([
    'suggestions', 'suggestion', 'hints', 'hint', 'url', 'string', 'plist',
    'dict', 'key', 'false', 'true', 'videos', 'submit', 'edit', 'client',
  ]);

  if (systemWords.has(clean)) return false;

  // Reject web question queries
  if (
    clean.startsWith('how to') ||
    clean.startsWith('what is') ||
    clean.startsWith('why do') ||
    clean.startsWith('where to')
  ) {
    return false;
  }

  return /^[a-z0-9\s\-\.\'\"]+$/.test(clean);
}

/**
 * Direct query to Apple's official MZSearchHints App Store autocomplete API
 */
async function fetchAppleNativeHints(queryTerm: string, store: string): Promise<string[]> {
  const query = encodeURIComponent(queryTerm.trim());
  const hints: string[] = [];

  try {
    const url = `https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?client=1&q=${query}&country=${store}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'iTunes/12.11.3 (Windows; N; Microsoft Windows 10)',
        'Accept': 'application/json, text/plain, */*',
      },
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data && Array.isArray(data.hints)) {
          data.hints.forEach((item: any) => {
            if (item.term && typeof item.term === 'string') {
              const clean = item.term.trim().toLowerCase();
              if (isValidAppStoreKeyword(clean)) hints.push(clean);
            }
          });
        }
      } catch (parseError) {
        const matches = text.match(/<string>([^<]+)<\/string>/g);
        if (matches) {
          matches.forEach((m) => {
            const term = m.replace(/<\/?string>/g, '').trim().toLowerCase();
            if (isValidAppStoreKeyword(term)) hints.push(term);
          });
        }
      }
    }
  } catch (error) {
    // Ignore fetch errors
  }

  return hints;
}

/**
 * Main iOS Autocomplete Fetcher - 100% Official Apple App Store Data Engine
 */
export async function getIosAutocomplete(keyword: string, country: CountryCode = 'us'): Promise<string[]> {
  const store = COUNTRIES.find((c) => c.code === country)?.storeCode || 'US';
  const seedClean = keyword.trim().toLowerCase();
  const suggestions = new Set<string>();

  if (isValidAppStoreKeyword(seedClean)) {
    suggestions.add(seedClean);
  }

  // 1. High-Yield Subqueries to Apple MZSearchHints API
  const subQueries = [
    seedClean,
    `${seedClean} app`,
    `${seedClean} free`,
    `${seedClean} pro`,
    `best ${seedClean}`,
    `${seedClean} tracker`,
    `${seedClean} planner`,
    `${seedClean} organizer`,
    `${seedClean} keeper`,
  ];

  try {
    const promiseBatch = subQueries.map((subQ) => fetchAppleNativeHints(subQ, store));
    const batchResults = await Promise.all(promiseBatch);

    batchResults.forEach((hintList) => {
      hintList.forEach((h) => {
        if (isValidAppStoreKeyword(h)) {
          suggestions.add(h);
        }
      });
    });
  } catch (err) {}

  return Array.from(suggestions).slice(0, 25);
}
