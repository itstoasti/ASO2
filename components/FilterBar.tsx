import React, { useState } from 'react';
import { Search, Download, Filter, Apple, Play, LayoutGrid, Table, Copy, Sparkles, Flame, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { KeywordResult } from '@/lib/types';

export type ViewMode = 'table' | 'grid' | 'copy';
export type DifficultyFilter = 'all' | 'easy' | 'moderate' | 'hard';
export type DemandFilter = 'all' | 'high' | 'medium' | 'low';
export type RelevanceFilter = 'all' | 'high' | 'medium';
export type PresetFilter = 'none' | 'indie_gems' | 'high_volume';

interface FilterBarProps {
  filterQuery: string;
  setFilterQuery: (val: string) => void;
  platformFilter: 'all' | 'ios' | 'android';
  setPlatformFilter: (val: 'all' | 'ios' | 'android') => void;
  highOppOnly: boolean;
  setHighOppOnly: (val: boolean) => void;
  difficultyFilter: DifficultyFilter;
  setDifficultyFilter: (val: DifficultyFilter) => void;
  demandFilter: DemandFilter;
  setDemandFilter: (val: DemandFilter) => void;
  relevanceFilter: RelevanceFilter;
  setRelevanceFilter: (val: RelevanceFilter) => void;
  presetFilter: PresetFilter;
  setPresetFilter: (val: PresetFilter) => void;
  viewMode: ViewMode;
  setViewMode: (val: ViewMode) => void;
  results: KeywordResult[];
  totalUnfilteredCount: number;
  seedKeyword: string;
  onResetFilters: () => void;
}

export function FilterBar({
  filterQuery,
  setFilterQuery,
  platformFilter,
  setPlatformFilter,
  highOppOnly,
  setHighOppOnly,
  difficultyFilter,
  setDifficultyFilter,
  demandFilter,
  setDemandFilter,
  relevanceFilter,
  setRelevanceFilter,
  presetFilter,
  setPresetFilter,
  viewMode,
  setViewMode,
  results,
  totalUnfilteredCount,
  seedKeyword,
  onResetFilters,
}: FilterBarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const exportCsv = () => {
    if (!results || results.length === 0) return;

    const headers = [
      'Keyword',
      'Platform',
      'Search Popularity (5-100)',
      'Estimated Monthly Impressions',
      'Demand Label',
      'Difficulty (0-100)',
      'Opportunity Score (0-100)',
      'Competing Apps Count',
      'Relevance',
    ];

    const rows = results.map((r) => [
      `"${r.keyword.replace(/"/g, '""')}"`,
      r.platform.toUpperCase(),
      r.searchPopularity,
      r.estimatedImpressions,
      r.demandLabel,
      r.difficulty,
      r.opportunityScore,
      r.competingApps,
      r.relevance,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `aso_keywords_${seedKeyword.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="w-full max-w-7xl mx-auto px-4 mb-4 space-y-3">
      {/* Primary Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3 rounded-2xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
        
        {/* Left: Quick Presets & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Preset Buttons Strip with touch scroll */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            <button
              type="button"
              onClick={() => {
                if (presetFilter === 'indie_gems') {
                  setPresetFilter('none');
                } else {
                  setPresetFilter('indie_gems');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 active:scale-95 cursor-pointer ${
                presetFilter === 'indie_gems'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Indie Dev Gems</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (presetFilter === 'high_volume') {
                  setPresetFilter('none');
                } else {
                  setPresetFilter('high_volume');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 active:scale-95 cursor-pointer ${
                presetFilter === 'high_volume'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-600/20'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="whitespace-nowrap">High Volume</span>
            </button>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 active:scale-95 cursor-pointer ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              )}
            </button>
          </div>

          {/* Search Filter Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-3 sm:top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter keywords..."
              className="w-full pl-8 pr-3 py-2 sm:py-1.5 text-base sm:text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Right: View Mode Switcher & Export Button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full lg:w-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('copy')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'copy'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="ASO Metadata Copy View"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ASO Copy</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={exportCsv}
            disabled={!results || results.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Advanced Multi-Combination Filter Panel */}
      {showAdvancedFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Multi-Combination Filters ({results.length} of {totalUnfilteredCount} shown)
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Filter 1: Platform */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Platform</label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as any)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Platforms</option>
                <option value="ios">iOS App Store</option>
                <option value="android">Android Google Play</option>
              </select>
            </div>

            {/* Filter 2: Difficulty Tier */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Difficulty Level</label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Low Competition (10 - 35)</option>
                <option value="moderate">Moderate Competition (36 - 65)</option>
                <option value="hard">High Competition (66 - 100)</option>
              </select>
            </div>

            {/* Filter 3: Search Demand Tier */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Search Volume / Demand</label>
              <select
                value={demandFilter}
                onChange={(e) => setDemandFilter(e.target.value as any)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Volume Tiers</option>
                <option value="high">High Volume (60+ SP)</option>
                <option value="medium">Moderate Volume (30 - 59 SP)</option>
                <option value="low">Low Volume (&lt;30 SP)</option>
              </select>
            </div>

            {/* Filter 4: Relevance Tier */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Relevance</label>
              <select
                value={relevanceFilter}
                onChange={(e) => setRelevanceFilter(e.target.value as any)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Relevance</option>
                <option value="high">High Relevance Only</option>
                <option value="medium">Medium &amp; High Relevance</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={highOppOnly}
                onChange={(e) => setHighOppOnly(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span>High Opportunity Only (Score &ge; 70)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
