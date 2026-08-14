export interface KeywordDensityItem {
  keyword: string;
  count: number;
  density: number; // percentage (e.g., 2.5%)
  status: 'optimal' | 'low' | 'high';
  isAboveFold: boolean;
}

export interface DescriptionAnalysis {
  wordCount: number;
  charCount: number;
  readingTimeMinutes: number;
  aboveTheFoldText: string;
  hasBullets: boolean;
  hasSocialProof: boolean;
  topKeywords: KeywordDensityItem[];
}

/**
 * Noise words, stop words, UI actions, technical tokens, and legal boilerplate
 * that DO NOT represent authentic ASO store search queries.
 */
const NOISE_AND_BOILERPLATE_WORDS = new Set([
  // Articles, prepositions, conjunctions, pronouns
  'a', 'about', 'above', 'across', 'after', 'again', 'against', 'all', 'almost', 'also',
  'am', 'among', 'an', 'and', 'another', 'any', 'anyone', 'anything', 'anyway', 'anywhere',
  'are', 'aren', 'around', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'didn', 'do', 'does',
  'doesn', 'doing', 'don', 'down', 'during', 'each', 'either', 'else', 'even', 'ever',
  'every', 'everyone', 'everything', 'everywhere', 'few', 'for', 'from', 'further', 'get',
  'gets', 'getting', 'got', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'however', 'i', 'if', 'in', 'into', 'is',
  'isn', 'it', 'its', 'itself', 'just', 'let', 'like', 'likely', 'make', 'makes', 'making',
  'made', 'many', 'may', 'me', 'might', 'more', 'most', 'much', 'must', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'often', 'on', 'once', 'one', 'ones', 'only',
  'onto', 'or', 'other', 'others', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'per',
  'rather', 'really', 'same', 'say', 'says', 'said', 'see', 'seeing', 'seen', 'she', 'should',
  'since', 'so', 'some', 'someone', 'something', 'sometime', 'somewhere', 'still', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'therefore',
  'these', 'they', 'this', 'those', 'through', 'thus', 'to', 'too', 'under', 'until', 'up',
  'upon', 'us', 'use', 'uses', 'used', 'using', 'various', 'very', 'was', 'wasn', 'we',
  'were', 'weren', 'what', 'whatever', 'when', 'where', 'which', 'while', 'who', 'whoever',
  'whom', 'whose', 'why', 'will', 'with', 'within', 'without', 'won', 'would', 'yes', 'yet',
  'you', 'your', 'yours', 'yourself', 'yourselves',

  // Generic UI Actions & Verbs
  'add', 'adding', 'added', 'enter', 'entering', 'entered', 'copy', 'paste', 'pasting',
  'share', 'sharing', 'shared', 'keep', 'keeper', 'keeping', 'kept', 'view', 'views',
  'viewing', 'viewed', 'find', 'finding', 'found', 'help', 'helps', 'helping', 'helped',
  'allow', 'allows', 'allowed', 'start', 'starting', 'started', 'open', 'opening', 'opened',
  'try', 'trying', 'tried', 'look', 'looking', 'looked', 'take', 'taking', 'taken', 'give',
  'giving', 'given', 'know', 'knowing', 'known', 'rate', 'rating', 'rated', 'flag', 'flagging',
  'built', 'single', 'mobile', 'tablet', 'desktop', 'phone', 'devices', 'device', 'favorites',
  'favorite', 'favourite', 'favourites', 'quick', 'quickly', 'instant', 'instantly',
  'directly', 'collection', 'collections', 'family', 'week', 'day', 'days', 'time', 'times',
  'part', 'parts', 'free', 'pro', 'plus', 'premium', 'version', 'versions', 'features',
  'feature', 'option', 'options', 'custom', 'customize', 'customizable', 'mode', 'modes',
  'item', 'items', 'content', 'contents', 'screen', 'screens', 'button', 'buttons', 'click',
  'clicking', 'tap', 'tapping', 'press', 'pressing', 'choose', 'choosing', 'chosen', 'select',
  'selecting', 'selected', 'check', 'checking', 'checked', 'update', 'updates', 'updating',
  'updated', 'remove', 'removing', 'removed', 'delete', 'deleting', 'deleted', 'manage',
  'manager', 'management', 'managing', 'managed', 'create', 'created', 'creating', 'creates',
  'provide', 'provides', 'providing', 'provided', 'including', 'includes', 'included',
  'available', 'access', 'enjoy', 'enjoying', 'experience', 'experiences', 'designed',
  'perfect', 'great', 'amazing', 'world', 'ultimate', 'welcome', 'companion', 'simple',
  'simply', 'easy', 'easily', 'best', 'new', 'way', 'ways', 'well', 'side', 'sizes', 'size',
  'serving', 'servings', 'creators', 'creator', 'download', 'downloading', 'install',
  'installing', 'platform', 'platforms', 'featuring', 'personal', 'personalized',
  'fingertips', 'trouble', 'ready', 'embark', 'journey', 'bring', 'brings', 'seamless',

  // Boilerplate, Legal, Disclaimers, URL Tokens
  'http', 'https', 'www', 'com', 'org', 'net', 'io', 'co', 'html', 'url', 'link', 'links',
  'nielsen', 'measurement', 'measurements', 'software', 'proprietary', 'privacy', 'policy',
  'policies', 'terms', 'service', 'services', 'conditions', 'copyright', 'rights', 'reserved',
  'contribute', 'contributes', 'market', 'research', 'ratings', 'information', 'support',
  'contact', 'subscription', 'subscriptions', 'subscribers', 'period', 'renew', 'renews',
  'renewal', 'charged', 'charge', 'account', 'confirmation', 'purchase', 'purchases',
  'cancel', 'cancellation', 'settings', 'developer', 'developed', 'inquiries', 'questions',
  'feedback', 'disclaimer', 'disclosures', 'license', 'agreement', 'stdeula', 'regard',
  'statement', 'choices', 'usage', 'subject', 'additionally', 'please', 'note', 'brand',
  'internet', 'hand', 'explore', 'vast', 'library', 'complete', 'guides', 'current', 'season',
  'special', 'occasions', 'expand', 'horizons', 'culinary', 'affordable', 'delivered',
  'picked', 'walmart', 'saving', 'money', 'connect', 'fellow', 'enthusiasts', 'photos',
  'creations', 'inspired', 'cooked', 'vibrant', 'supportive', 'ensuring', 'success', 'profile',
  'revisit', 'innovative', 'generates', 'ideas', 'accommodating', 'secrets', 'expertise',
  'powered', 'chatgpt', 'api', 'assistant', 'matches', 'preferences', 'tastes', 'adjust',
  'adjustable', 'values', 'forget', 'tiktok', 'instagram', 'facebook', 'youtube', 'email',
  'mail', 'mailto'
]);

/**
 * Domain-specific high-intent ASO keywords that real mobile users search for.
 */
const HIGH_INTENT_ASO_KEYWORDS = new Set([
  // Food & Cooking
  'recipe', 'recipes', 'cookbook', 'cookbooks', 'cooking', 'dinner', 'dinner ideas',
  'meal planner', 'meal plan', 'meal planning', 'grocery list', 'shopping list',
  'ingredients', 'ingredient', 'healthy recipes', 'meal prep', 'quick meals', 'easy recipes',
  'baking', 'dessert', 'desserts', 'food', 'nutrition', 'calories', 'diet', 'vegan',
  'vegetarian', 'keto', 'food tracker', 'recipe organizer', 'recipe box', 'recipe keeper',
  'dishes', 'dish', 'chef', 'kitchen', 'food recipes', 'baking recipes', 'cocktails',

  // Health & Fitness
  'workout', 'workouts', 'fitness', 'exercise', 'exercises', 'gym', 'gym workout',
  'calorie tracker', 'calorie counter', 'weight loss', 'fasting', 'intermittent fasting',
  'running', 'runner', 'jogging', 'steps', 'step counter', 'pedometer', 'water tracker',
  'hydration', 'muscle', 'bodybuilding', 'strength training', 'yoga', 'pilates', 'cardio',
  'stretching', 'sleep tracker', 'meditation', 'mental health', 'breathing',

  // Finance & Money
  'budget', 'budgeting', 'budget planner', 'expense tracker', 'money manager',
  'spending tracker', 'savings tracker', 'bills tracker', 'personal finance',
  'net worth', 'cash flow', 'debt payoff', 'crypto tracker', 'stocks tracker',

  // Productivity & Utilities
  'todo list', 'to-do list', 'task manager', 'habit tracker', 'daily planner',
  'routine planner', 'calendar', 'notes', 'notebook', 'checklist', 'timer',
  'focus timer', 'pomodoro', 'reminders', 'organizer', 'scanner', 'document scanner',

  // Travel & Navigation
  'flight tracker', 'trip planner', 'hotel booking', 'travel guide', 'maps',
  'gps navigation', 'road trip', 'packing list', 'offline maps',

  // Language & Learning
  'language learning', 'learn spanish', 'learn french', 'learn japanese',
  'vocabulary', 'flashcards', 'study timer', 'dictionary', 'translator'
]);

/**
 * Strips URLs, email addresses, and legal/footer boilerplate text from description
 */
function sanitizeStoreDescription(raw: string): string {
  if (!raw) return '';

  return raw
    // Strip URLs and web links
    .replace(/https?:\/\/[^\s]+/gi, ' ')
    .replace(/www\.[^\s]+/gi, ' ')
    .replace(/\S+@\S+/gi, ' ')
    .replace(/\b[\w-]+\.(com|org|net|io|co|app|edu|gov)\b[^\s]*/gi, ' ')
    // Strip common store disclaimer sentences
    .replace(/please note:[^\n]*/gi, ' ')
    .replace(/this app features nielsen[^.]*\./gi, ' ')
    .replace(/please see [^.]* for more information\./gi, ' ')
    .replace(/license agreement:[^\n]*/gi, ' ')
    .replace(/privacy policy:[^\n]*/gi, ' ')
    .replace(/terms of (use|service):[^\n]*/gi, ' ')
    .replace(/don’t forget to check out[^\n]*/gi, ' ')
    .replace(/payment will be charged to[^.]*\./gi, ' ')
    .replace(/subscription automatically renews[^.]*\./gi, ' ')
    .trim();
}

export function analyzeStoreDescription(description: string): DescriptionAnalysis {
  if (!description || typeof description !== 'string') {
    return {
      wordCount: 0,
      charCount: 0,
      readingTimeMinutes: 0,
      aboveTheFoldText: '',
      hasBullets: false,
      hasSocialProof: false,
      topKeywords: [],
    };
  }

  const rawCleanText = description.trim();
  const charCount = rawCleanText.length;

  // Above the fold: first 3 lines or ~300 chars
  const lines = rawCleanText.split('\n').filter(Boolean);
  const aboveTheFoldText = lines.slice(0, 3).join('\n').slice(0, 300);
  const aboveTheFoldLower = aboveTheFoldText.toLowerCase();

  // Social proof checks
  const socialProofRegex = /(million|thousand|users|featured|award|rated|reviews|#1|top|downloaded|loved by)/i;
  const hasSocialProof = socialProofRegex.test(rawCleanText);

  // Bullets check
  const hasBullets = rawCleanText.includes('•') || rawCleanText.includes('✔') || rawCleanText.includes('★') || rawCleanText.includes('- ') || rawCleanText.includes('* ');

  // Sanitize text before keyword tokenization
  const sanitizedText = sanitizeStoreDescription(rawCleanText);

  // Clean tokens array
  const rawTokens = sanitizedText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const wordCount = rawTokens.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const phraseCounts = new Map<string, number>();

  // 1. High-Intent 2-Word Search Phrases
  for (let i = 0; i < rawTokens.length - 1; i++) {
    const w1 = rawTokens[i];
    const w2 = rawTokens[i + 1];
    const phrase = `${w1} ${w2}`;

    if (HIGH_INTENT_ASO_KEYWORDS.has(phrase)) {
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
    } else if (
      !NOISE_AND_BOILERPLATE_WORDS.has(w1) &&
      !NOISE_AND_BOILERPLATE_WORDS.has(w2) &&
      w1.length >= 3 &&
      w2.length >= 3 &&
      !/^\d+$/.test(w1) &&
      !/^\d+$/.test(w2)
    ) {
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
    }
  }

  // 2. High-Value Domain Single Keywords (e.g. "recipes", "cooking", "dinner", "workout", "budget")
  for (const w of rawTokens) {
    if (!NOISE_AND_BOILERPLATE_WORDS.has(w) && (HIGH_INTENT_ASO_KEYWORDS.has(w) || w.length >= 4)) {
      phraseCounts.set(w, (phraseCounts.get(w) || 0) + 1);
    }
  }

  // Calculate density and score keywords based on authentic ASO ranking value
  const candidateKeywords = Array.from(phraseCounts.entries())
    .map(([keyword, count]) => {
      const isHighIntent = HIGH_INTENT_ASO_KEYWORDS.has(keyword);
      const isPhrase = keyword.includes(' ');
      const density = Math.round((count / Math.max(1, wordCount)) * 1000) / 10;

      let status: 'optimal' | 'low' | 'high' = 'optimal';
      if (density < 1.0) status = 'low';
      else if (density > 5.0) status = 'high';

      const isAboveFold = aboveTheFoldLower.includes(keyword);

      // Score: heavily reward authentic domain search queries & meaningful phrases
      const score = count * (isHighIntent ? 4.0 : 1.0) * (isPhrase ? 2.0 : 1.0);

      return {
        keyword,
        count,
        density,
        status,
        isAboveFold,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || b.count - a.count || b.density - a.density);

  // Filter out redundant single word fragments if a parent 2-word phrase is already present in top results
  const topPhrases = candidateKeywords.filter((k) => k.keyword.includes(' ')).map((k) => k.keyword);
  const filteredKeywords: KeywordDensityItem[] = [];

  for (const item of candidateKeywords) {
    if (!item.keyword.includes(' ')) {
      const inPhrase = topPhrases.some((p) => p.includes(item.keyword));
      if (inPhrase && item.count < 3) {
        continue;
      }
    }
    filteredKeywords.push({
      keyword: item.keyword,
      count: item.count,
      density: item.density,
      status: item.status,
      isAboveFold: item.isAboveFold,
    });
    if (filteredKeywords.length >= 6) break;
  }

  return {
    wordCount,
    charCount,
    readingTimeMinutes,
    aboveTheFoldText,
    hasBullets,
    hasSocialProof,
    topKeywords: filteredKeywords,
  };
}
