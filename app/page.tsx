'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CountryCode, AsaCredentials, Platform, ResearchResponse, KeywordResult } from '@/lib/types';
import { Header } from '@/components/Header';
import { SearchSection } from '@/components/SearchSection';
import { SummaryCards } from '@/components/SummaryCards';
import { FilterBar, ViewMode, DifficultyFilter, DemandFilter, RelevanceFilter, PresetFilter } from '@/components/FilterBar';
import { ResultsTable } from '@/components/ResultsTable';
import { GridView } from '@/components/GridView';
import { AsoCopyView } from '@/components/AsoCopyView';
import { TopAppsDrawer } from '@/components/TopAppsDrawer';
import { AsaConfigModal } from '@/components/AsaConfigModal';
import { SkeletonTable } from '@/components/SkeletonTable';
import { MobileNavBar } from '@/components/MobileNavBar';

export default function Home() {
  // Inputs State
  const [seedKeyword, setSeedKeyword] = useState('');
  const [platform, setPlatform] = useState<Platform>('both');
  const [country, setCountry] = useState<CountryCode>('us');
  const [appUrl, setAppUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Credentials State
  const [asaCredentials, setAsaCredentials] = useState<AsaCredentials | null>(null);
  const [isAsaModalOpen, setIsAsaModalOpen] = useState(false);

  // Response & Filtering State
  const [data, setData] = useState<ResearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-Combination Filters State
  const [filterQuery, setFilterQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'ios' | 'android'>('all');
  const [highOppOnly, setHighOppOnly] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [demandFilter, setDemandFilter] = useState<DemandFilter>('all');
  const [relevanceFilter, setRelevanceFilter] = useState<RelevanceFilter>('all');
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('none');

  // Display View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [selectedKeywordResult, setSelectedKeywordResult] = useState<KeywordResult | null>(null);

  // Primary Research Function
  const executeResearch = useCallback(async () => {
    if (!seedKeyword.trim() && !appUrl.trim() && !websiteUrl.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedKeyword,
          platform,
          country,
          appUrl,
          websiteUrl,
          asaCredentials,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to analyze keywords.');
      }

      const jsonPayload: ResearchResponse = await res.json();
      setData(jsonPayload);

      if (jsonPayload.seedKeyword && jsonPayload.seedKeyword !== seedKeyword) {
        setSeedKeyword(jsonPayload.seedKeyword);
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during keyword research.');
    } finally {
      setIsLoading(false);
    }
  }, [seedKeyword, platform, country, appUrl, websiteUrl, asaCredentials]);

  // Extract seed keywords from URL
  const handleExtractKeywords = async () => {
    const targetUrl = websiteUrl || appUrl;
    if (!targetUrl) return;

    setIsExtracting(true);
    try {
      const res = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.keywords && result.keywords.length > 0) {
          setSeedKeyword(result.keywords[0]);
          executeResearch();
        }
      }
    } catch (err) {
      console.error('Failed to extract keywords:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Reset all filters function
  const handleResetFilters = () => {
    setFilterQuery('');
    setPlatformFilter('all');
    setHighOppOnly(false);
    setDifficultyFilter('all');
    setDemandFilter('all');
    setRelevanceFilter('all');
    setPresetFilter('none');
  };

  // Multi-Combination Filter Execution
  const filteredResults = (data?.results || []).filter((item) => {
    // 1. Preset filter overrides
    if (presetFilter === 'indie_gems') {
      if (item.difficulty > 35 || item.opportunityScore < 70) return false;
    } else if (presetFilter === 'high_volume') {
      // High volume threshold: Search Popularity >= 45 or demandLabel === 'High'
      if (item.searchPopularity < 45 && item.demandLabel !== 'High') return false;
    }

    // 2. Text Search Query Filter
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      if (!item.keyword.toLowerCase().includes(q)) return false;
    }

    // 3. Platform Filter
    if (platformFilter !== 'all') {
      if (item.platform !== platformFilter) return false;
    }

    // 4. High Opportunity Checkbox
    if (highOppOnly) {
      if (item.opportunityScore < 70) return false;
    }

    // 5. Difficulty Level Filter
    if (difficultyFilter === 'easy') {
      if (item.difficulty > 35) return false;
    } else if (difficultyFilter === 'moderate') {
      if (item.difficulty <= 35 || item.difficulty > 65) return false;
    } else if (difficultyFilter === 'hard') {
      if (item.difficulty <= 65) return false;
    }

    // 6. Search Volume / Demand Filter
    if (demandFilter === 'high') {
      if (item.searchPopularity < 45 && item.demandLabel !== 'High') return false;
    } else if (demandFilter === 'medium') {
      if (item.searchPopularity < 25 || item.searchPopularity >= 45) return false;
    } else if (demandFilter === 'low') {
      if (item.searchPopularity >= 25) return false;
    }

    // 7. Relevance Filter
    if (relevanceFilter === 'high') {
      if (item.relevance !== 'High') return false;
    } else if (relevanceFilter === 'medium') {
      if (item.relevance === 'Low') return false;
    }

    return true;
  });

  const searchSectionRef = useRef<HTMLDivElement>(null);

  const scrollToSearch = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const hasActiveFilters =
    filterQuery.trim() !== '' ||
    platformFilter !== 'all' ||
    highOppOnly ||
    difficultyFilter !== 'all' ||
    demandFilter !== 'all' ||
    relevanceFilter !== 'all' ||
    presetFilter !== 'none';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 sm:pb-0">
      {/* Header Navigation */}
      <Header
        onOpenAsaModal={() => setIsAsaModalOpen(true)}
        asaConfigured={data?.asaStatus.authenticated || !!asaCredentials}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Search Hero */}
        <div ref={searchSectionRef}>
          <SearchSection
            seedKeyword={seedKeyword}
            setSeedKeyword={setSeedKeyword}
            platform={platform}
            setPlatform={setPlatform}
            country={country}
            setCountry={setCountry}
            appUrl={appUrl}
            setAppUrl={setAppUrl}
            websiteUrl={websiteUrl}
            setWebsiteUrl={setWebsiteUrl}
            onSearch={executeResearch}
            isLoading={isLoading}
            onExtractKeywords={handleExtractKeywords}
            isExtracting={isExtracting}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="w-full max-w-4xl mx-auto px-4 mb-6">
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="font-bold underline ml-4 hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <SkeletonTable />
        ) : data ? (
          <>
            {/* Summary Stat Banner */}
            <SummaryCards data={data} />

            {/* Filter & View Toolbar */}
            <FilterBar
              filterQuery={filterQuery}
              setFilterQuery={setFilterQuery}
              platformFilter={platformFilter}
              setPlatformFilter={setPlatformFilter}
              highOppOnly={highOppOnly}
              setHighOppOnly={setHighOppOnly}
              difficultyFilter={difficultyFilter}
              setDifficultyFilter={setDifficultyFilter}
              demandFilter={demandFilter}
              setDemandFilter={setDemandFilter}
              relevanceFilter={relevanceFilter}
              setRelevanceFilter={setRelevanceFilter}
              presetFilter={presetFilter}
              setPresetFilter={setPresetFilter}
              viewMode={viewMode}
              setViewMode={setViewMode}
              results={filteredResults}
              totalUnfilteredCount={data.results.length}
              seedKeyword={data.seedKeyword}
              onResetFilters={handleResetFilters}
            />

            {/* Display View Modes */}
            {viewMode === 'table' && (
              <ResultsTable
                results={filteredResults}
                onSelectKeyword={(res) => setSelectedKeywordResult(res)}
              />
            )}

            {viewMode === 'grid' && (
              <GridView
                results={filteredResults}
                onSelectKeyword={(res) => setSelectedKeywordResult(res)}
              />
            )}

            {viewMode === 'copy' && (
              <AsoCopyView
                results={filteredResults}
                seedKeyword={data.seedKeyword}
              />
            )}
          </>
        ) : null}
      </main>

      {/* Mobile App Dock / Navigation Bar */}
      <MobileNavBar
        viewMode={viewMode}
        onViewChange={(mode) => setViewMode(mode)}
        onToggleFilters={() => {
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
        hasActiveFilters={hasActiveFilters}
        onOpenAsaModal={() => setIsAsaModalOpen(true)}
        asaConfigured={data?.asaStatus.authenticated || !!asaCredentials}
        onScrollToSearch={scrollToSearch}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 text-center text-xs text-slate-500 mb-14 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <span>ASO Keyword Research Tool — Built for iOS App Store & Google Play</span>
        </div>
      </footer>

      {/* Top Ranking Competitors Drawer */}
      <TopAppsDrawer
        keywordResult={selectedKeywordResult}
        onClose={() => setSelectedKeywordResult(null)}
      />

      {/* Apple Search Ads Credentials Modal */}
      <AsaConfigModal
        isOpen={isAsaModalOpen}
        onClose={() => setIsAsaModalOpen(false)}
        initialCredentials={asaCredentials}
        onSaveCredentials={(creds) => {
          setAsaCredentials(creds);
          executeResearch();
        }}
      />
    </div>
  );
}
