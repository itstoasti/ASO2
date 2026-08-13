import { AppMetadata } from '../types';

/**
 * Calculates Keyword Difficulty (0-100) based on competitive strength of top ranking apps,
 * review count distribution, title saturation, and phrase specificity.
 */
export function calculateKeywordDifficulty(
  keyword: string,
  topApps: AppMetadata[],
  totalCompetingApps: number
): number {
  const kwClean = keyword.toLowerCase().trim();
  const wordCount = kwClean.split(/\s+/).length;

  // Baseline difficulty derived from phrase specificity (Long-tail terms are inherently less competitive)
  let baseDifficulty = 65;
  if (wordCount === 1) baseDifficulty = 85;
  else if (wordCount === 2) baseDifficulty = 65;
  else if (wordCount === 3) baseDifficulty = 45;
  else if (wordCount >= 4) baseDifficulty = 25;

  if (!topApps || topApps.length === 0) {
    return Math.max(12, baseDifficulty - 15);
  }

  const top5 = topApps.slice(0, 5);

  // 1. Review & Install Volume Score (40% Weight)
  let totalReviews = 0;
  top5.forEach((app) => {
    totalReviews += app.reviewCount || 0;
  });
  const avgReviews = totalReviews / Math.max(1, top5.length);

  // Logarithmic review scale:
  // < 500 reviews -> ~15/100 (Easy)
  // 5,000 reviews -> ~40/100 (Moderate)
  // 50,000 reviews -> ~70/100 (Hard)
  // 500,000+ reviews -> 95/100 (Ultra Hard)
  const reviewScore = Math.min(100, Math.max(5, Math.log10(avgReviews + 1) * 18));

  // 2. Keyword Title Saturation (25% Weight)
  // How many top 10 apps explicitly target this exact phrase in their title
  let titleMatches = 0;
  topApps.slice(0, 10).forEach((app) => {
    if (app.name.toLowerCase().includes(kwClean)) {
      titleMatches++;
    }
  });
  const titleSaturationScore = Math.min(100, (titleMatches / 10) * 100);

  // 3. Competitor Volume Index (20% Weight)
  const competitorScore = Math.min(100, Math.max(10, Math.log10(totalCompetingApps + 1) * 22));

  // 4. Rating Strength (15% Weight)
  let totalRating = 0;
  let ratedCount = 0;
  top5.forEach((app) => {
    if (app.rating > 0) {
      totalRating += app.rating;
      ratedCount++;
    }
  });
  const avgRating = ratedCount > 0 ? totalRating / ratedCount : 4.0;
  const ratingScore = Math.min(100, Math.max(20, (avgRating - 3.5) * 60));

  // Combine weighted factors & apply word-count long-tail damping
  const rawDifficulty =
    reviewScore * 0.40 +
    titleSaturationScore * 0.25 +
    competitorScore * 0.20 +
    ratingScore * 0.15;

  // Long-tail damping factor: 4+ word keywords get up to 35% reduction in difficulty
  const dampingFactor = wordCount >= 4 ? 0.65 : wordCount === 3 ? 0.82 : 1.0;
  const finalDifficulty = Math.round(rawDifficulty * dampingFactor);

  return Math.min(98, Math.max(10, finalDifficulty));
}
