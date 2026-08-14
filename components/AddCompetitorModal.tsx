import React, { useState } from 'react';
import { CompetitorApp } from '@/lib/competitor-types';
import { TrackedApp } from '@/lib/rank-tracker-types';
import { Search, Plus, Apple, Play, Loader2, X, Star, Check } from 'lucide-react';
import { Badge } from './Badge';

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetApp: TrackedApp;
  onAddCompetitor: (competitor: CompetitorApp) => void;
  existingCompetitorIds: string[];
}

export function AddCompetitorModal({
  isOpen,
  onClose,
  targetApp,
  onAddCompetitor,
  existingCompetitorIds,
}: AddCompetitorModalProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchedApp, setSearchedApp] = useState<CompetitorApp | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchedApp(null);

    try {
      const res = await fetch('/api/app-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: query.trim(),
          platform: targetApp.platform,
          country: targetApp.country,
        }),
      });

      if (!res.ok) {
        throw new Error('App not found. Please try entering the direct App Store / Play Store URL or exact name.');
      }

      const data = await res.json();
      if (!data || !data.name) {
        throw new Error('No app metadata found for this search.');
      }

      const competitor: CompetitorApp = {
        id: data.id,
        name: data.name,
        developer: data.developer || 'Developer',
        iconUrl: data.iconUrl,
        platform: data.platform || targetApp.platform,
        country: data.country || targetApp.country,
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        installs: data.installs,
        category: data.category || 'Apps',
        version: data.version,
        updatedAt: data.updatedAt,
        description: data.description,
        releaseNotes: data.releaseNotes,
        screenshots: data.screenshots || [],
        price: data.price || 'Free',
        addedAt: new Date().toISOString(),
      };

      setSearchedApp(competitor);
    } catch (err: any) {
      setError(err?.message || 'Failed to lookup competitor app.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!searchedApp) return;
    onAddCompetitor(searchedApp);
    setSearchedApp(null);
    setQuery('');
    onClose();
  };

  const isAlreadyAdded = searchedApp ? existingCompetitorIds.includes(searchedApp.id) : false;
  const isSelf = searchedApp ? searchedApp.id === targetApp.id : false;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={targetApp.platform === 'ios' ? 'ios' : 'android'}>
                {targetApp.platform === 'ios' ? (
                  <>
                    <Apple className="w-3 h-3" /> iOS Competitor
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-emerald-600" /> Android Competitor
                  </>
                )}
              </Badge>
              <span className="text-xs text-slate-400 font-medium">Add to Competitor Set</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Add Direct Competitor
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparing against <strong className="text-slate-700 dark:text-slate-300">{targetApp.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Competitor App Name or Store URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={targetApp.platform === 'ios' ? 'e.g. Babbel, Duolingo, or App Store URL' : 'e.g. com.babbel.mobile, Duolingo, or Play Store URL'}
                className="w-full pl-9 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Enter any competitor brand name or full store link to auto-fetch live metadata and screenshots.
            </p>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Preview Found App */}
        {searchedApp && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              {searchedApp.iconUrl ? (
                <img
                  src={searchedApp.iconUrl}
                  alt={searchedApp.name}
                  className="w-12 h-12 rounded-xl object-cover shadow-xs border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {searchedApp.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {searchedApp.name}
                </h4>
                <p className="text-xs text-slate-500 truncate">{searchedApp.developer}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  {searchedApp.rating ? (
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {searchedApp.rating}
                    </span>
                  ) : null}
                  {searchedApp.reviewCount ? (
                    <span>({searchedApp.reviewCount.toLocaleString()} ratings)</span>
                  ) : null}
                  {searchedApp.category ? (
                    <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] text-slate-700 dark:text-slate-300">
                      {searchedApp.category}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Screenshots preview */}
            {searchedApp.screenshots && searchedApp.screenshots.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Screenshots Available ({searchedApp.screenshots.length})
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {searchedApp.screenshots.slice(0, 4).map((shot, idx) => (
                    <img
                      key={idx}
                      src={shot}
                      alt="screenshot"
                      className="h-16 w-auto rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={isAlreadyAdded || isSelf}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                  isAlreadyAdded || isSelf
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isAlreadyAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Already Added
                  </>
                ) : isSelf ? (
                  'Cannot Add Self'
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Add Competitor
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
