export interface AiKeywordSuggestion {
  keyword: string;
  relevanceReason: string;
  category: 'core_feature' | 'high_intent' | 'category' | 'long_tail';
}

/**
 * AI-powered ASO Keyword Intelligence Engine
 * Generates highly relevant, intent-driven ASO keywords based on app capabilities and seed concepts.
 */
export async function generateAiAsoKeywords(
  appName: string,
  developer?: string,
  platform: 'ios' | 'android' = 'android'
): Promise<AiKeywordSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are a mobile app store user standing in the ${platform === 'ios' ? 'Apple App Store' : 'Google Play Store'} with your smartphone open to the Search Tab.
You are looking to find and install a mobile application like "${appName}" (Developer: "${developer || 'Unknown'}").

Task: Think strictly from the perspective of an active smartphone user typing queries directly into the ${platform === 'ios' ? 'App Store' : 'Play Store'} search bar to find an application to install on their device.

Rules for generating 25 high-converting ASO keywords:
1. STORE SEARCHER PERSPECTIVE: Generate exact phrases that real mobile users type when searching for smartphone apps (e.g., "recipe saver app", "save recipes from instagram", "digital recipe box", "recipe keeper", "recipe organizer app", "import recipes", "meal planner free").
2. EXCLUDE WEB SEARCHES: Strictly NEVER generate web search / cooking recipe queries (e.g., "recipes with chicken", "how to bake bread", "meatloaf recipe", "banana bread"). Users do NOT open the ${platform === 'ios' ? 'App Store' : 'Play Store'} to read web blog recipes; they open the store to download a functional mobile app.
3. INTENT CATEGORIES:
   - "core_feature": Specific app tools/utilities (e.g., "recipe URL importer", "recipe scanner app").
   - "high_intent": Users actively seeking an app solution (e.g., "recipe saver app free", "digital cookbook organizer").
   - "category": Broad store category terms (e.g., "recipe keeper", "meal planner app").
   - "long_tail": Niche user workflows (e.g., "save recipes from tiktok", "offline recipe manager").

Output MUST be a valid JSON array of objects with keys: "keyword", "relevanceReason", "category".`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (res.ok) {
        const json = await res.json();
        let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => ({
              keyword: String(item.keyword).toLowerCase().trim(),
              relevanceReason: String(item.relevanceReason || 'Core app capability'),
              category: item.category || 'high_intent',
            }));
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API fetch error, using smart fallback AI model:', err);
    }
  }

  // Smart Built-in ASO Domain Model Fallback when API Key is not set
  return generateDomainAsoKeywords(appName);
}

/**
 * AI-powered Keyword Research Expansion Engine
 * Generates a rich pool of semantic, high-intent ASO expansion keywords for any seed query.
 */
export async function generateAiKeywordExpansions(
  seedKeyword: string,
  platform: 'ios' | 'android' = 'android'
): Promise<AiKeywordSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are an ASO (App Store Optimization) Keyword Specialist assisting a mobile developer.
The developer entered the seed search query: "${seedKeyword}".

Task: Think from the perspective of active smartphone users searching the ${platform === 'ios' ? 'Apple App Store' : 'Google Play Store'} search bar.
Generate a list of 20 high-converting, semantically related ASO search phrases that users search for when looking for apps related to "${seedKeyword}".

Rules:
1. STORE INTENT: Focus ONLY on mobile app search terms (e.g. for "recipes", suggest "recipe saver app", "digital recipe box", "recipe keeper", "recipe organizer", "meal planner app free", "import recipes app").
2. NO WEB SEARCHES: Do NOT generate web blog articles or cooking instructions (e.g. "how to cook rice", "chicken breast recipe").
3. INTENT CATEGORIES: Output JSON array of objects with keys: "keyword", "relevanceReason", "category" (must be one of: "core_feature", "high_intent", "category", "long_tail").`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(2500),
      });

      if (res.ok) {
        const json = await res.json();
        let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => ({
              keyword: String(item.keyword).toLowerCase().trim(),
              relevanceReason: String(item.relevanceReason || `AI semantic expansion for "${seedKeyword}"`),
              category: item.category || 'high_intent',
            }));
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API research expansion error:', err);
    }
  }

  return generateDomainAsoKeywords(seedKeyword);
}

/**
 * Domain-aware ASO Keyword Intelligence Model
 */
function generateDomainAsoKeywords(appName: string): AiKeywordSuggestion[] {
  const titleLower = appName.toLowerCase();
  const suggestions: AiKeywordSuggestion[] = [];

  // Recipe / Cooking / Food Apps
  if (titleLower.includes('recipe') || titleLower.includes('cook') || titleLower.includes('meal') || titleLower.includes('food')) {
    suggestions.push(
      { keyword: 'recipe saver app', relevanceReason: 'Direct feature: Save & bookmark recipes', category: 'core_feature' },
      { keyword: 'recipe keeper', relevanceReason: 'Top category competitor query', category: 'category' },
      { keyword: 'recipe organizer', relevanceReason: 'Core app benefit: Organize personal recipes', category: 'core_feature' },
      { keyword: 'digital recipe box', relevanceReason: 'High intent: Store custom recipes', category: 'high_intent' },
      { keyword: 'save recipes from instagram', relevanceReason: 'Trending social media recipe import', category: 'long_tail' },
      { keyword: 'save recipes from tiktok', relevanceReason: 'Trending social media recipe import', category: 'long_tail' },
      { keyword: 'import recipes app', relevanceReason: 'Core feature: Web & URL recipe parser', category: 'core_feature' },
      { keyword: 'meal planner app', relevanceReason: 'Related category utility', category: 'category' },
      { keyword: 'recipe manager free', relevanceReason: 'High intent: Free recipe storage', category: 'high_intent' },
      { keyword: 'cookbook organizer', relevanceReason: 'High intent: Digital cookbook', category: 'high_intent' },
      { keyword: 'grocery list recipe planner', relevanceReason: 'High intent: Meal prep & shopping list', category: 'long_tail' },
      { keyword: 'recipe binder', relevanceReason: 'High intent: Personal recipe archive', category: 'core_feature' }
    );

    const brandWord = appName.split(/[:\-\s]/)[0].toLowerCase().trim();
    if (brandWord.length >= 3) {
      suggestions.unshift(
        { keyword: brandWord, relevanceReason: 'Exact brand query', category: 'core_feature' },
        { keyword: `${brandWord} app`, relevanceReason: 'Brand app intent', category: 'high_intent' }
      );
    }
    return suggestions;
  }

  // Fitness / Workout / Health Apps
  if (titleLower.includes('fit') || titleLower.includes('workout') || titleLower.includes('gym') || titleLower.includes('calorie')) {
    suggestions.push(
      { keyword: 'workout planner app', relevanceReason: 'Core app capability', category: 'core_feature' },
      { keyword: 'gym log tracker', relevanceReason: 'High intent workout logging', category: 'high_intent' },
      { keyword: 'calorie counter free', relevanceReason: 'Top category query', category: 'category' },
      { keyword: 'fitness tracker app', relevanceReason: 'Core category search', category: 'category' },
      { keyword: 'exercise log book', relevanceReason: 'Long tail workout intent', category: 'long_tail' }
    );
    return suggestions;
  }

  // Finance / Budget Apps
  if (titleLower.includes('budget') || titleLower.includes('money') || titleLower.includes('finance') || titleLower.includes('expense')) {
    suggestions.push(
      { keyword: 'budget planner app', relevanceReason: 'Core app capability', category: 'core_feature' },
      { keyword: 'expense tracker free', relevanceReason: 'High intent expense logging', category: 'high_intent' },
      { keyword: 'money manager', relevanceReason: 'Top category query', category: 'category' },
      { keyword: 'monthly budget keeper', relevanceReason: 'Long tail intent', category: 'long_tail' }
    );
    return suggestions;
  }

  // Generic SaaS / Utility Fallback
  const cleanTitle = appName.split(/[:\-]/)[0].toLowerCase().trim();
  return [
    { keyword: `${cleanTitle} app`, relevanceReason: 'Brand search query', category: 'core_feature' },
    { keyword: `${cleanTitle} organizer`, relevanceReason: 'Utility intent', category: 'high_intent' },
    { keyword: `${cleanTitle} planner`, relevanceReason: 'Planning utility', category: 'category' },
    { keyword: `${cleanTitle} free`, relevanceReason: 'Free app search intent', category: 'long_tail' }
  ];
}
