import React, { useState, useEffect } from 'react';
import { TrackedApp, TrackedKeyword } from '@/lib/rank-tracker-types';
import { getTrackedApps, saveTrackedKeyword, getTrackedKeywords } from '@/lib/rank-tracker-storage';
import { KeywordResult, Platform, CountryCode } from '@/lib/types';
import { Target, X, Check, RefreshCw, Plus, Apple, Play, ArrowRight, ExternalLink, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TrackKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  keywordResult: KeywordResult | null;
  onSuccessTrack?: (targetApp: TrackedApp, rank: number | null) => void;
  onOpenAddApp?: () => void;
}

export function TrackKeywordModal({
  isOpen,
  onClose,
  keywordResult,
  onSuccessTrack,
  onOpenAddApp,
}: TrackKeywordModalProps) {
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [trackedAppSuccess, setTrackedAppSuccess] = useState<{ app: TrackedApp; rank: number | null } | null>(null);

  useEffect(() => {
    if (isOpen && keywordResult) {
      const loaded = getTrackedApps();
      // Filter apps by matching platform if keyword has platform specified
      const matchingApps = keywordResult.platform
        ? loaded.filter((a) => a.platform === keywordResult.platform)
        : loaded;

      setApps(matchingApps);
      if (matchingApps.length > 0) {
        setSelectedAppId(matchingApps[0].id);
      } else {
        setSelectedAppId(null);
      }
      setTrackedAppSuccess(null);
      setIsSaving(false);
    }
  }, [isOpen, keywordResult]);

  if (!isOpen || !keywordResult) return null;

  const allTrackedKeywords = getTrackedKeywords();

  const handleSelectAndTrack = async (targetApp: TrackedApp) => {
    setSelectedAppId(targetApp.id);
    setIsSaving(true);

    let liveRank: number | null = null;

    try {
      // Execute live rank check for this target app
      const res = await fetch('/api/rank-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: targetApp.id,
          keywords: [keywordResult.keyword],
          platform: targetApp.platform,
          country: targetApp.country,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          liveRank = data.results[0].rank;
        }
      }
    } catch (e) {
      console.error('Failed checking rank on track:', e);
    }

    const trackedKw: TrackedKeyword = {
      id: `kw_${Date.now()}_${keywordResult.id || Math.random().toString(36).substring(2, 7)}`,
      keyword: keywordResult.keyword,
      platform: targetApp.platform,
      country: targetApp.country || 'us',
      targetAppId: targetApp.id,
      currentRank: liveRank,
      previousRank: null,
      rankDelta: null,
      searchPopularity: keywordResult.searchPopularity,
      difficulty: keywordResult.difficulty,
      competingApps: keywordResult.competingApps,
      lastCheckedAt: new Date().toISOString(),
    };

    saveTrackedKeyword(trackedKw);
    setIsSaving(false);
    setTrackedAppSuccess({ app: targetApp, rank: liveRank });

    if (onSuccessTrack) {
      onSuccessTrack(targetApp, liveRank);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-lg">
                <Target className="w-4 h-4" />
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Track Rank Position
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select which app to monitor for keyword:{' '}
              <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                "{keywordResult.keyword}"
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {trackedAppSuccess ? (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Keyword Added to Rank Tracker!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracking <span className="font-bold text-slate-800 dark:text-slate-200">"{keywordResult.keyword}"</span> for{' '}
                <span className="font-bold text-blue-600">{trackedAppSuccess.app.name}</span>
              </p>

              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Current Store Rank:</span>
                {trackedAppSuccess.rank ? (
                  <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-md text-xs font-extrabold">
                    Rank #{trackedAppSuccess.rank}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-md text-xs">
                    Unranked (&gt;50)
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Close
              </button>
              <Link
                href="/rank-tracker"
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>View in Rank Tracker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* App Selector List */
          <div className="space-y-3">
            {apps.length === 0 ? (
              <div className="py-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  No {keywordResult.platform === 'ios' ? 'iOS' : 'Android'} apps added to your Rank Tracker yet.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenAddApp) onOpenAddApp();
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add an {keywordResult.platform === 'ios' ? 'iOS' : 'Android'} App</span>
                </button>
              </div>
            ) : (
              <>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select App ({apps.length} available)
                </label>
                
                <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                  {apps.map((app) => {
                    const isSelected = selectedAppId === app.id;
                    const appKwCount = allTrackedKeywords.filter((k) => k.targetAppId === app.id).length;

                    return (
                      <button
                        key={app.id}
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSelectAndTrack(app)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                          isSelected
                            ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-500/40 dark:border-blue-500/50 ring-1 ring-blue-500/20'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* App Icon */}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                            {app.iconUrl ? (
                              <img src={app.iconUrl} alt={app.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-extrabold text-blue-600">
                                {app.name.charAt(0)}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[200px]">
                                {app.name}
                              </h4>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md flex items-center gap-1 ${
                                  app.platform === 'ios'
                                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                                }`}
                              >
                                {app.platform === 'ios' ? (
                                  <Apple className="w-2.5 h-2.5" />
                                ) : (
                                  <Play className="w-2.5 h-2.5" />
                                )}
                                <span className="uppercase">{app.platform}</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              by {app.developer} &bull; {appKwCount} tracked term{appKwCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>

                        {/* Action Status */}
                        <div className="shrink-0 pl-2">
                          {isSaving && isSelected ? (
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 animate-pulse">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Checking...</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all group-hover:scale-105 inline-flex items-center gap-1">
                              <span>Track</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
