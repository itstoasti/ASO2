import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrackedApp } from '@/lib/rank-tracker-types';
import { DiscoveredKeyword } from '@/app/api/auto-detect-keywords/route';
import { convertPopularityToImpressions, convertAndroidDemandToVolume } from '@/lib/scoring/impressions';
import {
  Sparkles,
  X,
  Plus,
  Check,
  RefreshCw,
  Award,
  TrendingUp,
  Apple,
  Play,
  Info,
  Layers,
} from 'lucide-react';

interface AutoDetectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApp: TrackedApp | null;
  existingTrackedKeywords: string[];
  onAddKeywords: (keywords: DiscoveredKeyword[]) => void;
}

export function AutoDetectModal({
  isOpen,
  onClose,
  selectedApp,
  existingTrackedKeywords,
  onAddKeywords,
}: AutoDetectModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Extracting app metadata & N-grams...');
  const [discovered, setDiscovered] = useState<DiscoveredKeyword[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'gems' | 'striking'>('all');
  const [addedKeywordSet, setAddedKeywordSet] = useState<Set<string>>(new Set());
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && selectedApp) {
      runAutoDetect();
    }
  }, [isOpen, selectedApp]);

  const runAutoDetect = async () => {
    if (!selectedApp) return;
    setIsLoading(true);
    setDiscovered([]);
    setLoadingStep('Mining app metadata & N-gram candidate phrases...');

    try {
      setTimeout(() => setLoadingStep('Analyzing competitor search indexes & store suggestions...'), 1200);
      setTimeout(() => setLoadingStep('Verifying live store ranking positions (#1–#50)...'), 2800);

      const res = await fetch('/api/auto-detect-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: selectedApp.id,
          platform: selectedApp.platform,
          country: selectedApp.country,
          appName: selectedApp.name,
          developer: selectedApp.developer,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.discovered)) {
        setDiscovered(data.discovered);
      }
    } catch (err) {
      console.error('Auto-detect fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !selectedApp || !mounted) return null;

  const existingLowerSet = new Set(existingTrackedKeywords.map((k) => k.toLowerCase()));

  const gems = discovered.filter((d) => d.category === 'gem');
  const striking = discovered.filter((d) => d.category === 'striking');

  const filteredDiscovered = discovered.filter((d) => {
    if (activeTab === 'gems') return d.category === 'gem';
    if (activeTab === 'striking') return d.category === 'striking';
    return true;
  });
  const handleTrackSingle = (kw: DiscoveredKeyword) => {
    onAddKeywords([kw]);
    setAddedKeywordSet((prev) => new Set(prev).add(kw.keyword.toLowerCase()));
  };

  const handleTrackAll = () => {
    const newItems = discovered.filter((d) => !existingLowerSet.has(d.keyword.toLowerCase()) && !addedKeywordSet.has(d.keyword.toLowerCase()));
    if (newItems.length > 0) {
      onAddKeywords(newItems);
      const newSet = new Set(addedKeywordSet);
      newItems.forEach((item) => newSet.add(item.keyword.toLowerCase()));
      setAddedKeywordSet(newSet);
      setIsSuccessMessage(true);
      setTimeout(() => {
        setIsSuccessMessage(false);
        onClose();
      }, 500);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-[95vw] sm:w-full sm:max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 z-10 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Auto-Detect Organic Keywords
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scanning live store index for keywords <span className="font-bold text-slate-700 dark:text-slate-200">{selectedApp.name}</span> currently ranks for
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isLoading && (
              <button
                type="button"
                onClick={runAutoDetect}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Rescan organic rankings"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto shadow-md animate-pulse">
              <RefreshCw className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Mining Store Index &amp; Checking Positions...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {loadingStep}
              </p>
            </div>
          </div>
        ) : discovered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <Info className="w-6 h-6 mx-auto text-slate-400" />
            <p className="font-bold text-slate-700 dark:text-slate-300">No organic ranking terms detected in the top 50 yet.</p>
            <p className="text-slate-400 max-w-sm mx-auto">Try tracking seed keywords manually or optimize your title &amp; subtitle metadata.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Tabs & Batch CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  All Discovered ({discovered.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('gems')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'gems'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  Top 10 Gems ({gems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('striking')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'striking'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-blue-600 dark:text-slate-400'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Striking Distance ({striking.length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleTrackAll}
                disabled={isSuccessMessage}
                className={`px-3 py-1.5 text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
                  isSuccessMessage
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSuccessMessage ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Added Keywords!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Track All Discovered ({discovered.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Discovered Keywords Table Container */}
            <div className="overflow-x-auto overflow-y-auto max-h-[55vh] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <table className="w-full text-left border-collapse text-xs min-w-[580px]">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3.5 w-52">Discovered Keyword</th>
                    <th className="py-2.5 px-3.5 w-28 text-center">Category</th>
                    <th className="py-2.5 px-3.5 w-24 text-center">Store Rank</th>
                    <th className="py-2.5 px-3.5 text-right">Est. Volume / Demand</th>
                    <th className="py-2.5 px-3.5 text-right">Difficulty</th>
                    <th className="py-2.5 px-3.5 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredDiscovered.map((item, idx) => {
                    const isAlreadyTracked = existingLowerSet.has(item.keyword.toLowerCase()) || addedKeywordSet.has(item.keyword.toLowerCase());

                    const estVol = item.platform === 'android'
                      ? convertAndroidDemandToVolume(item.searchPopularity)
                      : convertPopularityToImpressions(item.searchPopularity);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors h-11">
                        {/* Keyword */}
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white truncate">
                          {item.keyword}
                        </td>

                        {/* Category Tag (Dedicated column for perfect straight-line alignment) */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {item.category === 'gem' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-extrabold">
                              💎 Top 10
                            </span>
                          ) : item.category === 'striking' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[10px] font-extrabold">
                              🎯 Striking
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                              ⚡ Reach
                            </span>
                          )}
                        </td>

                        {/* Live Store Rank (Centered, uniform width) */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center w-11 py-1 rounded-lg text-xs font-black border ${
                              item.rank <= 5
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                                : item.rank <= 10
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                          >
                            #{item.rank}
                          </span>
                        </td>

                        {/* Est Volume / Demand */}
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-white block leading-tight">
                            {item.searchPopularity} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            ~{estVol.toLocaleString()} mo. {item.platform === 'ios' ? 'imp.' : 'demand'}
                          </span>
                        </td>

                        {/* Difficulty */}
                        <td className="py-2.5 px-3.5 text-right font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.difficulty} / 100
                        </td>

                        {/* Action Button */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {isAlreadyTracked ? (
                            <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded-lg border border-slate-200/60 dark:border-slate-700/60 w-24">
                              <Check className="w-3 h-3 text-emerald-600" /> Tracked
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTrackSingle(item)}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95 w-24"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Track Rank</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
