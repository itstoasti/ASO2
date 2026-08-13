import React, { useState } from 'react';
import { KeywordResult } from '@/lib/types';
import { Badge } from './Badge';
import { Apple, Play, ChevronRight, Target, Check } from 'lucide-react';
import { TrackKeywordModal } from './TrackKeywordModal';

interface GridViewProps {
  results: KeywordResult[];
  onSelectKeyword: (res: KeywordResult) => void;
}

export function GridView({ results, onSelectKeyword }: GridViewProps) {
  const [trackedIds, setTrackedIds] = useState<Record<string, boolean>>({});
  const [modalKeyword, setModalKeyword] = useState<KeywordResult | null>(null);

  const handleTrackKeyword = (e: React.MouseEvent, item: KeywordResult) => {
    e.stopPropagation();
    setModalKeyword(item);
  };

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item) => {
          const isHighOpp = item.opportunityScore >= 70;
          const isMediumOpp = item.opportunityScore >= 40 && item.opportunityScore < 70;

          return (
            <div
              key={item.id}
              onClick={() => onSelectKeyword(item)}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Header: Platform & Opportunity Badge */}
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={item.platform === 'ios' ? 'ios' : 'android'}>
                    {item.platform === 'ios' ? (
                      <>
                        <Apple className="w-3 h-3" /> iOS
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-emerald-600" /> Android
                      </>
                    )}
                  </Badge>

                  <span
                    className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-black border transition-all ${
                      isHighOpp
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                        : isMediumOpp
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    Opp: {item.opportunityScore}
                  </span>
                </div>

                {/* Keyword Title */}
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
                  <span className="truncate">&quot;{item.keyword}&quot;</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
                </h3>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Search Popularity</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.searchPopularity} / 100
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      ~{item.estimatedImpressions.toLocaleString()} mo.
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Difficulty</span>
                    <span
                      className={`font-bold ${
                        item.difficulty > 70
                          ? 'text-rose-600'
                          : item.difficulty > 40
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {item.difficulty} / 100
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {item.competingApps.toLocaleString()} apps
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Competitors Preview & Track Button */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={(e) => handleTrackKeyword(e, item)}
                  className={`px-2 py-1 rounded-lg border font-bold flex items-center gap-1 transition-all ${
                    trackedIds[item.id]
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {trackedIds[item.id] ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" /> Tracked
                    </>
                  ) : (
                    <>
                      <Target className="w-3 h-3 text-slate-500" /> Track Rank
                    </>
                  )}
                </button>

                <span className="text-blue-600 dark:text-blue-400 font-semibold shrink-0 group-hover:underline">
                  Analyze &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <TrackKeywordModal
        isOpen={!!modalKeyword}
        onClose={() => setModalKeyword(null)}
        keywordResult={modalKeyword}
        onSuccessTrack={(app) => {
          if (modalKeyword) {
            setTrackedIds((prev) => ({ ...prev, [modalKeyword.id]: true }));
          }
        }}
      />
    </div>
  );
}
