import { CountryCode, Platform, AppMetadata } from './types';

export interface TrackedApp {
  id: string; // Track ID (iOS) or Package Name (Android)
  name: string;
  developer: string;
  iconUrl?: string;
  platform: 'ios' | 'android';
  country: CountryCode;
  addedAt: string;
}

export interface RankSnapshot {
  date: string;
  rank: number | null; // 1-50, null if >50 / unranked
}

export interface TrackedKeyword {
  id: string;
  keyword: string;
  platform: 'ios' | 'android';
  country: CountryCode;
  targetAppId: string;
  currentRank: number | null; // 1-50, null if unranked
  previousRank: number | null;
  rankDelta: number | null; // positive = improved (+2), negative = dropped (-3)
  searchPopularity: number;
  difficulty: number;
  competingApps: number;
  lastCheckedAt: string;
  top3Competitors?: AppMetadata[];
  history?: RankSnapshot[];
}

export interface RankCheckRequest {
  appId: string;
  keywords: string[];
  platform: 'ios' | 'android';
  country: CountryCode;
}

export interface RankCheckResult {
  keyword: string;
  rank: number | null;
  searchPopularity: number;
  difficulty: number;
  competingApps: number;
  top3Competitors: AppMetadata[];
}
