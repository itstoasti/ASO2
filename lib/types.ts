export type Platform = 'ios' | 'android' | 'both';
export type CountryCode = 'us' | 'gb' | 'ca' | 'au' | 'de' | 'fr' | 'jp' | 'kr' | 'es' | 'it' | 'br' | 'mx';

export interface CountryOption {
  code: CountryCode;
  name: string;
  flag: string;
  storeCode: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'us', name: 'United States', flag: 'US', storeCode: 'US' },
  { code: 'gb', name: 'United Kingdom', flag: 'GB', storeCode: 'GB' },
  { code: 'ca', name: 'Canada', flag: 'CA', storeCode: 'CA' },
  { code: 'au', name: 'Australia', flag: 'AU', storeCode: 'AU' },
  { code: 'de', name: 'Germany', flag: 'DE', storeCode: 'DE' },
  { code: 'fr', name: 'France', flag: 'FR', storeCode: 'FR' },
  { code: 'jp', name: 'Japan', flag: 'JP', storeCode: 'JP' },
  { code: 'kr', name: 'South Korea', flag: 'KR', storeCode: 'KR' },
  { code: 'es', name: 'Spain', flag: 'ES', storeCode: 'ES' },
  { code: 'it', name: 'Italy', flag: 'IT', storeCode: 'IT' },
  { code: 'br', name: 'Brazil', flag: 'BR', storeCode: 'BR' },
  { code: 'mx', name: 'Mexico', flag: 'MX', storeCode: 'MX' },
];

export interface AppMetadata {
  id: string;
  name: string;
  developer: string;
  rating: number;
  reviewCount: number;
  iconUrl?: string;
  installs?: string;
  position: number;
  subtitle?: string;
  matchedIn?: 'title' | 'subtitle' | 'description';
  reviewVelocity30d?: number;
}

export interface PlacementBreakdown {
  titlePercentage: number;
  subtitlePercentage: number;
  descriptionPercentage: number;
  titleOpportunity: 'High' | 'Medium' | 'Low';
  avg30dReviewVelocity: number;
}

export interface KeywordResult {
  id: string;
  keyword: string;
  platform: 'ios' | 'android';
  searchPopularity: number; // 5 - 100
  estimatedImpressions: number; // Monthly estimate
  demandLabel: 'High' | 'Medium' | 'Low';
  difficulty: number; // 0 - 100
  opportunityScore: number; // 0 - 100
  competingApps: number;
  relevance: 'High' | 'Medium' | 'Low';
  relevanceScore: number;
  topApps: AppMetadata[];
  isEstimatedVolume: boolean;
  dataQualityNote?: string;
  placementBreakdown?: PlacementBreakdown;
  isAiGenerated?: boolean;
  aiRelevanceReason?: string;
}

export interface ResearchResponse {
  seedKeyword: string;
  country: CountryCode;
  platform: Platform;
  totalKeywords: number;
  highOpportunityCount: number;
  avgDifficulty: number;
  topVolumeKeyword: string;
  results: KeywordResult[];
  extractedSeedKeywords?: string[];
  asaStatus?: {
    configured: boolean;
    authenticated: boolean;
    message?: string;
  };
  timestamp: string;
}

export interface AsaCredentials {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}
