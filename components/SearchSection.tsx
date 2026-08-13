import React from 'react';
import { Search, Globe, Smartphone, Apple, Play, Sparkles } from 'lucide-react';
import { CountryCode, COUNTRIES, Platform } from '@/lib/types';
import { AdvancedInputs } from './AdvancedInputs';

interface SearchSectionProps {
  seedKeyword: string;
  setSeedKeyword: (val: string) => void;
  platform: Platform;
  setPlatform: (val: Platform) => void;
  country: CountryCode;
  setCountry: (val: CountryCode) => void;
  appUrl: string;
  setAppUrl: (val: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (val: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  onExtractKeywords?: () => void;
  isExtracting?: boolean;
}

export function SearchSection({
  seedKeyword,
  setSeedKeyword,
  platform,
  setPlatform,
  country,
  setCountry,
  appUrl,
  setAppUrl,
  websiteUrl,
  setWebsiteUrl,
  onSearch,
  isLoading,
  onExtractKeywords,
  isExtracting,
}: SearchSectionProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <section className="w-full pt-10 pb-6 px-4 text-center max-w-4xl mx-auto">
      {/* Title & Subtitle */}
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          ASO Keyword Research
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
          Discover high-opportunity keywords, official Apple Search Ads popularity metrics, and competitive difficulty for App Store and Google Play.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Search Input & Controls Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-2 sm:p-3 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none space-y-3">
          {/* Seed Keyword Input */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              placeholder="Enter seed keyword (e.g. fitness tracker, budget planner, vpn)..."
              required={!appUrl && !websiteUrl}
              className="w-full pl-12 pr-4 py-3 text-base bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Controls Row: Platform Segmented Control + Country Dropdown + Action CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* Segmented Control */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPlatform('ios')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  platform === 'ios'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Apple className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>iOS</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('android')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  platform === 'android'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Play className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('both')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  platform === 'both'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-600" />
                <span>Both</span>
              </button>
            </div>

            {/* Country Selector */}
            <div className="relative w-full sm:w-48">
              <Globe className="absolute left-3 top-3 sm:top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
                className="w-full pl-9 pr-8 py-2.5 sm:py-1.5 text-xs sm:text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.storeCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Primary CTA Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Analyzing Stores...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Research Keywords</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Section */}
        <AdvancedInputs
          appUrl={appUrl}
          setAppUrl={setAppUrl}
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          onExtractKeywords={onExtractKeywords}
          isExtracting={isExtracting}
        />

        {/* Quick Suggestion Chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold">Try:</span>
          {['recipe tracker', 'meal planner', 'recipe keeper', 'fitness tracker', 'habit tracker', 'budget planner'].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setSeedKeyword(chip);
              }}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700/60 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
            >
              + {chip}
            </button>
          ))}
        </div>
      </form>
    </section>
  );
}
