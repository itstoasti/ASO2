/**
 * Calculates Opportunity Score (0-100)
 * High opportunity = low competition difficulty + good search demand + strong relevance.
 * Designed specifically to highlight low-competition long-tail gems for developers.
 */
export function calculateOpportunityScore(
  searchPopularity: number,
  difficulty: number,
  relevanceScore: number // 0 - 100
): number {
  const demand = Math.max(5, searchPopularity);
  const diff = Math.max(5, difficulty);
  const relFactor = Math.max(0.5, relevanceScore / 100);

  // Scaled ratio formula:
  // Low difficulty (< 35) with High demand (> 50) -> 85 - 99 (High Opportunity - Green!)
  // Moderate difficulty (35 - 55) with Moderate demand (30 - 50) -> 55 - 75 (Moderate Opportunity)
  // High difficulty (75+) -> 15 - 35 (Low Opportunity - Extremely competitive)
  const baseRatio = (demand / (Math.pow(diff / 10, 1.7) + 4)) * 17;
  const finalScore = baseRatio * relFactor;

  return Math.round(Math.min(99, Math.max(5, finalScore)));
}

/**
 * Calculates relevance score (0-100) and label between seed keyword and target keyword
 */
export function calculateRelevance(seed: string, keyword: string): { score: number; label: 'High' | 'Medium' | 'Low' } {
  const s = seed.toLowerCase().trim();
  const k = keyword.toLowerCase().trim();

  if (s === k) {
    return { score: 100, label: 'High' };
  }

  // Check for duplicate consecutive words (e.g. "recipe recipe")
  const kwWords = k.split(/\s+/).filter(Boolean);
  for (let i = 0; i < kwWords.length - 1; i++) {
    if (kwWords[i] === kwWords[i + 1]) {
      return { score: 25, label: 'Low' };
    }
  }

  const seedWords = s.split(/\s+/).filter(Boolean);

  const sharedWords = seedWords.filter((w) => kwWords.includes(w));
  const overlapRatio = sharedWords.length / Math.max(1, seedWords.length);

  if (overlapRatio >= 0.8 || k.startsWith(s) || k.endsWith(s)) {
    return { score: 95, label: 'High' };
  } else if (overlapRatio >= 0.4 || k.includes(s)) {
    return { score: 80, label: 'Medium' };
  } else if (sharedWords.length > 0) {
    return { score: 65, label: 'Medium' };
  }

  return { score: 45, label: 'Low' };
}
