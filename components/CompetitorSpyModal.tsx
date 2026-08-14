import React, { useState, useEffect } from 'react';
import { CompetitorApp, DiscoveredCompetitorKeyword } from '@/lib/competitor-types';
import { TrackedApp, TrackedKeyword } from '@/lib/rank-tracker-types';
import { saveTrackedKeyword, isKeywordTracked } from '@/lib/rank-tracker-storage';
import { X, Sparkles, Plus, Check, Loader2, Target, ArrowUpRight, Search, ShieldCheck } from 'lucide-react';
import { Badge } from './Badge';

interface CompetitorSpyModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetApp: TrackedApp;
  competitor: CompetitorApp | null;
  onKeywordAdded: () => void;
}

export function CompetitorSpyModal({
  isOpen,
  onClose,
  targetApp,
  competitor,
  onKeywordAdded,
}: CompetitorSpyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [keywords, setKeywords] = useState<DiscoveredCompetitorKeyword[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !competitor) return;

    setIsLoading(true);
    setKeywords([]);

    fetch('/api/competitor-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetApp,
        competitor,
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && Array.isArray(data.discovered)) {
          setKeywords(data.discovered);
        }
      })
      .catch((err) => {
        console.error('Competitor keyword discovery error:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, competitor, targetApp]);

  if (!isOpen || !competitor) return null;

  const handleTrackKeyword = (item: DiscoveredCompetitorKeyword) => {
    const newKw: TrackedKeyword = {
      id: `${targetApp.id}_${item.keyword.toLowerCase().trim()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      targetAppId: targetApp.id,
      keyword: item.keyword,
      country: targetApp.country,
      platform: targetApp.platform,
      searchPopularity: item.searchPopularity,
      difficulty: item.difficulty,
      competingApps: 0,
      currentRank: null, // Will be computed on next matrix refresh
      previousRank: null,
      rankDelta: 0,
      lastCheckedAt: new Date().toISOString(),
    };

    saveTrackedKeyword(newKw);
    setTrackedIds((prev) => new Set([...prev, item.keyword.toLowerCase().trim()]));
    onKeywordAdded();
  };

  const filtered = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(filterQuery.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            {competitor.iconUrl ? (
              <img
                src={competitor.iconUrl}
                alt={competitor.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                {competitor.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Keyword Spy Engine
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Keywords Targeted by {competitor.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Filter Bar */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter discovered competitor keywords..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Scrollable Content Table */}
        <div className="flex-1 overflow-y-auto min-h-[300px] border border-slate-200 dark:border-slate-800 rounded-xl">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">
                Reverse-engineering {competitor.name}&apos;s keyword strategy & ranks...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No competitor keywords found matching your filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                <tr>
                  <th className="py-2.5 px-4">Keyword</th>
                  <th className="py-2.5 px-3">Competitor Rank</th>
                  <th className="py-2.5 px-3">Search Pop.</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filtered.map((item, idx) => {
                  const isTracked = trackedIds.has(item.keyword.toLowerCase().trim()) || isKeywordTracked(item.keyword, targetApp.id);

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        {item.keyword}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.competitorRank ? (
                          <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                            item.competitorRank <= 3
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black'
                              : item.competitorRank <= 10
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            #{item.competitorRank}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">&gt;50</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(100, item.searchPopularity)}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                            {item.searchPopularity}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200/60 dark:border-slate-700/60">
                          {item.source.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleTrackKeyword(item)}
                          disabled={isTracked}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 shadow-2xs ${
                            isTracked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isTracked ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Tracked
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" /> Track
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 shrink-0">
          <span>Found {keywords.length} organic & metadata keywords</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
