'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CountryCode, Platform, ResearchResponse, KeywordResult } from '@/lib/types';
import { Header } from '@/components/Header';
import { SearchSection } from '@/components/SearchSection';
import { SummaryCards } from '@/components/SummaryCards';
import { FilterBar, ViewMode, DifficultyFilter, DemandFilter, RelevanceFilter, PresetFilter } from '@/components/FilterBar';
import { ResultsTable } from '@/components/ResultsTable';
import { GridView } from '@/components/GridView';
import { AsoCopyView } from '@/components/AsoCopyView';
import { TopAppsDrawer } from '@/components/TopAppsDrawer';
import { SkeletonTable } from '@/components/SkeletonTable';
import { MobileNavBar } from '@/components/MobileNavBar';

export default function Home() {
  // Inputs State
  const [seedKeyword, setSeedKeyword] = useState('');
  const [platform, setPlatform] = useState<Platform>('both');
  const [country, setCountry] = useState<CountryCode>('us');
  const [appUrl, setAppUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

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
    if (!seedKeyword.trim() && !appUrl.trim() && !websiteUrl.trim()) {
      setError('Please provide a seed keyword, App Store / Play Store link, or website URL.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seedKeyword,
          platform,
          country,
          appUrl,
          websiteUrl,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to complete keyword research.');
      }

      const resData: ResearchResponse = await response.json();
      setData(resData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while researching keywords.');
    } finally {
      setIsLoading(false);
    }
  }, [seedKeyword, platform, country, appUrl, websiteUrl]);

  // Extract Keywords Action
  const handleExtractKeywords = async (url: string) => {
    setIsExtracting(true);
    setError(null);
    try {
      const res = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: url }),
      });

      if (res.ok) {
        const extracted = await res.json();
        if (extracted.keywords && extracted.keywords.length > 0) {
          setSeedKeyword(extracted.keywords[0]);
        }
      }
    } catch (err) {
      console.error('Extract keywords error:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Reset Filters Action
  const handleResetFilters = () => {
    setFilterQuery('');
    setPlatformFilter('all');
    setHighOppOnly(false);
    setDifficultyFilter('all');
    setDemandFilter('all');
    setRelevanceFilter('all');
    setPresetFilter('none');
  };

  // Filter Pipeline
  const filteredResults = (data?.results || []).filter((item) => {
    // 1. Text Query Filter
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      if (!item.keyword.toLowerCase().includes(q)) return false;
    }

    // 2. Platform Filter
    if (platformFilter !== 'all') {
      if (item.platform !== platformFilter) return false;
    }

    // 3. High Opportunity Check
    if (highOppOnly && item.opportunityScore < 60) return false;

    // 4. Difficulty Filter
    if (difficultyFilter !== 'all') {
      if (difficultyFilter === 'easy' && item.difficulty > 35) return false;
      if (difficultyFilter === 'moderate' && (item.difficulty <= 35 || item.difficulty > 65)) return false;
      if (difficultyFilter === 'hard' && item.difficulty <= 65) return false;
    }

    // 5. Demand Filter
    if (demandFilter !== 'all') {
      if (demandFilter === 'low' && item.searchPopularity >= 30) return false;
      if (demandFilter === 'medium' && (item.searchPopularity < 30 || item.searchPopularity > 60)) return false;
      if (demandFilter === 'high' && item.searchPopularity <= 60) return false;
    }

    // 6. Relevance Filter
    if (relevanceFilter !== 'all') {
      if (item.relevance.toLowerCase() !== relevanceFilter) return false;
    }

    // 7. Preset Filter
    if (presetFilter === 'indie_gems') {
      if (item.difficulty > 45 || item.opportunityScore < 60) return false;
    } else if (presetFilter === 'high_volume') {
      if (item.searchPopularity < 50) return false;
    }

    return true;
  });

  const searchSectionRef = useRef<HTMLDivElement>(null);

  const scrollToSearch = () => {
    if (searchSectionRef.current) {
      searchSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 sm:pb-0">
      {/* Header Navigation */}
      <Header activeTab="research" />

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
            onExtractKeywords={() => handleExtractKeywords(appUrl || websiteUrl)}
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
                className="font-bold underline ml-4 hover:no-underline cursor-pointer"
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

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavBar activeTab="research" />

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
    </div>
  );
}
