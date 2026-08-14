import { CountryCode, Platform, AppMetadata } from './types';

export interface CompetitorApp {
  id: string; // Track ID (iOS) or Package Name (Android)
  name: string;
  developer: string;
  iconUrl?: string;
  platform: 'ios' | 'android';
  country: CountryCode;
  rating?: number;
  reviewCount?: number;
  installs?: string;
  category?: string;
  version?: string;
  updatedAt?: string;
  description?: string;
  subtitle?: string;
  releaseNotes?: string;
  screenshots?: string[];
  price?: string;
  addedAt: string;
}

export interface CompetitorRankCheck {
  competitorId: string;
  name: string;
  iconUrl?: string;
  rank: number | null; // 1-50, null if unranked (>50)
}

export interface CompetitorKeywordMatrixRow {
  keyword: string;
  searchPopularity: number;
  difficulty: number;
  competingApps: number;
  myRank: number | null; // Target App Rank
  competitorRanks: CompetitorRankCheck[];
  outrankingCount: number; // How many competitors my app beats
  isOpportunityGap: boolean; // At least 1 competitor is Top 10, but my app is > 20 or null
  isWinning: boolean; // My app is #1 or outranks all competitors
  isBattleground: boolean; // Both my app and at least one competitor are Top 10
}

export interface DiscoveredCompetitorKeyword {
  keyword: string;
  searchPopularity: number;
  difficulty: number;
  source: 'title' | 'subtitle' | 'description' | 'organic_rank';
  competitorName: string;
  competitorId: string;
  competitorRank?: number | null;
}

export interface CompetitorReview {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  date: string;
  helpfulCount?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  topic: string;
  painPointTag?: string;
  developerReply?: {
    date?: string;
    body: string;
  };
}

export interface CompetitorPainPoint {
  category: string;
  title: string;
  description: string;
  userQuote: string;
  frequency: 'High' | 'Medium' | 'Low';
  opportunity: string;
}

export interface CompetitorReviewAnalysis {
  appId: string;
  totalReviews: number;
  averageRating: number;
  sentimentBreakdown: {
    positivePercent: number; // 4-5 stars
    neutralPercent: number;  // 3 stars
    negativePercent: number; // 1-2 stars
    starDistribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  painPoints: CompetitorPainPoint[];
  reviews: CompetitorReview[];
  lastUpdated: number;
}

