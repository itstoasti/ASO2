import jwt from 'jsonwebtoken';
import { AsaCredentials } from '../types';

export interface AsaPopularityResult {
  keyword: string;
  popularity: number; // 5 - 100
  isOfficial: boolean;
}

/**
 * Generates an ES256 Client Secret JWT for Apple Search Ads OAuth token exchange
 */
export function generateAsaJwt(credentials: AsaCredentials): string {
  const { clientId, teamId, keyId, privateKey } = credentials;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 180, // 3 minutes validity
    aud: 'https://appleid.apple.com/auth/oauth2/token',
    sub: clientId,
  };

  const header = {
    alg: 'ES256',
    kid: keyId,
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header,
  });
}

/**
 * Exchanges client secret JWT for an Apple Search Ads OAuth Access Token
 */
export async function getAsaAccessToken(credentials: AsaCredentials): Promise<string | null> {
  try {
    const clientSecret = generateAsaJwt(credentials);
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: clientSecret,
      scope: 'searchads',
    });

    const response = await fetch('https://appleid.apple.com/auth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'appleid.apple.com',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('ASA OAuth Token generation failed:', response.status, errText);
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.warn('Error authenticating with Apple Search Ads:', error);
    return null;
  }
}

/**
 * Fetches official Search Popularity score (5-100) from Apple Search Ads API
 */
export async function getOfficialAsaPopularity(
  keywords: string[],
  credentials?: AsaCredentials | null
): Promise<Map<string, AsaPopularityResult>> {
  const resultsMap = new Map<string, AsaPopularityResult>();

  // Check env vars if credentials parameter is empty
  const activeCreds: AsaCredentials | null = credentials || (
    process.env.ASA_CLIENT_ID &&
    process.env.ASA_TEAM_ID &&
    process.env.ASA_KEY_ID &&
    process.env.ASA_PRIVATE_KEY
      ? {
          clientId: process.env.ASA_CLIENT_ID,
          teamId: process.env.ASA_TEAM_ID,
          keyId: process.env.ASA_KEY_ID,
          privateKey: process.env.ASA_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }
      : null
  );

  let accessToken: string | null = null;
  if (activeCreds) {
    accessToken = await getAsaAccessToken(activeCreds);
  }

  if (accessToken) {
    try {
      // ASA Keyword Search Popularity endpoint
      const response = await fetch('https://api-searchads.apple.com/api/v4/keywords/search-popularity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-AP-Context': 'orgId=' + (activeCreds?.teamId || ''),
        },
        body: JSON.stringify({ keywords }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
          data.data.forEach((item: any) => {
            if (item.keyword && typeof item.searchPopularity === 'number') {
              resultsMap.set(item.keyword.toLowerCase(), {
                keyword: item.keyword,
                popularity: Math.max(5, Math.min(100, item.searchPopularity)),
                isOfficial: true,
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to call ASA search popularity endpoint:', error);
    }
  }

  // Fallback for any keyword not populated by official API
  keywords.forEach((kw) => {
    const kLower = kw.toLowerCase().trim();
    if (!resultsMap.has(kLower)) {
      resultsMap.set(kLower, {
        keyword: kw,
        popularity: estimateIosPopularityFallback(kw),
        isOfficial: false,
      });
    }
  });

  return resultsMap;
}

/**
 * Fallback score estimator for iOS search popularity when ASA credentials are not present
 */
/**
 * Fallback score estimator for iOS search popularity when ASA credentials are not present
 */
export function estimateIosPopularityFallback(keyword: string): number {
  const kw = keyword.toLowerCase().trim();
  const words = kw.split(/\s+/);
  const length = kw.length;

  // Single word top head category terms
  const tier1SingleHeadTerms = [
    'recipes', 'recipe', 'fitness', 'workout', 'calorie', 'diet', 'meal', 'food', 'fasting',
    'vpn', 'music', 'game', 'games', 'casino', 'dating', 'finance', 'budget',
    'calendar', 'notes', 'weather', 'scanner', 'pdf', 'calculator', 'planner',
    'tracker', 'counter', 'manager', 'organizer', 'keeper', 'saver', 'photo'
  ];

  // Exact 1-word head term match
  if (words.length === 1 && tier1SingleHeadTerms.includes(kw)) {
    return 72 + (length % 8);
  }

  // Common high-intent 2-word category terms (e.g. "recipe keeper", "meal planner")
  const tier2HeadPairs = [
    'recipe keeper', 'meal planner', 'recipe box', 'recipe app', 'calorie counter',
    'fitness tracker', 'workout planner', 'habit tracker', 'photo editor', 'budget planner',
    'pdf scanner', 'recipe organizer', 'cooking app', 'recipe book', 'fasting tracker'
  ];

  if (words.length === 2 && tier2HeadPairs.includes(kw)) {
    return 54 + (kw.length % 8);
  }

  // 2-word terms containing a head term (e.g. "easy recipe", "best planner")
  if (words.length === 2) {
    const hasHead = words.some(w => tier1SingleHeadTerms.includes(w));
    if (hasHead) {
      return 38 + (length % 12);
    }
    return 28 + (length % 10);
  }

  // 3-word terms
  if (words.length === 3) {
    const hasHead = words.some(w => tier1SingleHeadTerms.includes(w));
    if (hasHead) {
      return 22 + (length % 10);
    }
    return 15 + (length % 8);
  }

  // 4+ word long-tail terms
  return 10 + (length % 8);
}
