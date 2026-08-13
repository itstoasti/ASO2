import React, { useState } from 'react';
import { KeywordResult } from '@/lib/types';
import { Badge } from './Badge';
import { Tooltip } from './Tooltip';
import { ArrowUpDown, ArrowUp, ArrowDown, Apple, Play, Info, ChevronRight, Target, Check } from 'lucide-react';
import { saveTrackedKeyword, getTrackedApps } from '@/lib/rank-tracker-storage';
import { TrackedKeyword } from '@/lib/rank-tracker-types';
import { TrackKeywordModal } from './TrackKeywordModal';

interface ResultsTableProps {
  results: KeywordResult[];
  onSelectKeyword: (res: KeywordResult) => void;
}

type SortField = 'keyword' | 'platform' | 'searchPopularity' | 'difficulty' | 'opportunityScore' | 'competingApps' | 'relevanceScore';
type SortOrder = 'asc' | 'desc';

export function ResultsTable({ results, onSelectKeyword }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('opportunityScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [trackedIds, setTrackedIds] = useState<Record<string, boolean>>({});
  const [modalKeyword, setModalKeyword] = useState<KeywordResult | null>(null);

  const handleTrackKeyword = (e: React.MouseEvent, item: KeywordResult) => {
    e.stopPropagation();
    setModalKeyword(item);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (typeof aVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
    );
  };

  if (!results || results.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 my-8 text-center py-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Keywords Match Active Filters</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Try expanding your seed keyword or clearing active filter presets.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mb-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/40 dark:shadow-none">
        
        {/* Mobile View: Touch List Cards for Phone Screens (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Keywords ({sortedResults.length})</span>
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('opportunityScore')}>
              <span>Sort: Opp</span>
              {renderSortIcon('opportunityScore')}
            </div>
          </div>

          {sortedResults.map((item) => {
            const isHighOpp = item.opportunityScore >= 70;
            const isMediumOpp = item.opportunityScore >= 40 && item.opportunityScore < 70;

            return (
              <div
                key={item.id}
                onClick={() => onSelectKeyword(item)}
                className="p-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 active:scale-[0.99] transition-all cursor-pointer space-y-2.5"
              >
                {/* Top Row: Keyword Title & Opportunity Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {item.keyword}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleTrackKeyword(e, item)}
                      className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                        trackedIds[item.id]
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {trackedIds[item.id] ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Target className="w-3.5 h-3.5" />}
                    </button>

                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-black border shrink-0 ${
                        isHighOpp
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                          : isMediumOpp
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Opp: {item.opportunityScore}
                    </span>
                  </div>
                </div>

                {/* Sub Row: Platform, Search Popularity, Difficulty */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
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

                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-[11px]">
                    <div>
                      <span>Vol: </span>
                      <strong className="text-slate-900 dark:text-white">{item.searchPopularity}</strong>
                    </div>

                    <div>
                      <span>Diff: </span>
                      <strong
                        className={
                          item.difficulty > 70
                            ? 'text-rose-600'
                            : item.difficulty > 40
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        {item.difficulty}
                      </strong>
                    </div>

                    <div>
                      <span>Apps: </span>
                      <strong className="text-slate-900 dark:text-white">{item.competingApps}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full Data Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[880px]">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                {/* Keyword Header */}
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      onClick={() => handleSort('keyword')}
                      className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Keyword
                    </span>
                    {renderSortIcon('keyword')}
                    <Tooltip position="bottom" align="left" content="The exact search phrase typed by users on the Apple App Store or Google Play Store." />
                  </div>
                </th>

                {/* Platform Header */}
                <th className="py-3.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      onClick={() => handleSort('platform')}
                      className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Platform
                    </span>
                    {renderSortIcon('platform')}
                    <Tooltip position="bottom" align="left" content="Target app store platform (iOS App Store or Android Google Play)." />
                  </div>
                </th>

                {/* Volume / Demand Header */}
                <th className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Tooltip position="bottom" align="center" content="Search Popularity index (5-100) and quantitative estimated monthly search impressions/demand." />
                    <span
                      onClick={() => handleSort('searchPopularity')}
                      className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Volume / Demand
                    </span>
                    {renderSortIcon('searchPopularity')}
                  </div>
                </th>

                {/* Difficulty Header */}
                <th className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Tooltip position="bottom" align="center" content="Competitive difficulty (0-100) based on top apps' review counts, title keyword saturation, and star ratings. Scores between 10-35 are low competition." />
                    <span
                      onClick={() => handleSort('difficulty')}
                      className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Difficulty
                    </span>
                    {renderSortIcon('difficulty')}
                  </div>
                </th>

                {/* Opportunity Header */}
                <th className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Tooltip position="bottom" align="center" content="Calculated opportunity score (0-100) balancing search volume against difficulty. Green scores (>=70) indicate low-competition high-opportunity keywords ideal for indie developers." />
                    <span
                      onClick={() => handleSort('opportunityScore')}
                      className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Opportunity
                    </span>
                    {renderSortIcon('opportunityScore')}
                  </div>
                </th>

                {/* Competing Apps Header */}
                <th className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Tooltip position="bottom" align="center" content="Estimated total number of competing apps currently indexed in store search results for this keyword phrase." />
                    <span
                      onClick={() => handleSort('competingApps')}
                      className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Competing Apps
                    </span>
                    {renderSortIcon('competingApps')}
                  </div>
                </th>

                {/* Relevance Header */}
                <th className="py-3.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      onClick={() => handleSort('relevanceScore')}
                      className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Relevance
                    </span>
                    {renderSortIcon('relevanceScore')}
                    <Tooltip position="bottom" align="right" content="Relevance alignment between your seed keyword and the expanded search phrase." />
                  </div>
                </th>

                {/* Track Action Header */}
                <th className="py-3.5 px-3 text-center">
                  <span>Track</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {sortedResults.map((item) => {
                const isHighOpp = item.opportunityScore >= 70;
                const isMediumOpp = item.opportunityScore >= 40 && item.opportunityScore < 70;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectKeyword(item)}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    {/* Keyword Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.keyword}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </td>

                    {/* Platform Badge */}
                    <td className="py-3.5 px-3">
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
                    </td>

                    {/* Volume / Popularity Score */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.searchPopularity}
                          </span>
                          <span className="text-[10px] text-slate-400">/ 100</span>
                        </div>

                        {item.platform === 'ios' ? (
                          <span className="text-[10px] text-slate-500 font-medium">
                            ~{item.estimatedImpressions.toLocaleString()} mo. imp.
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400 font-medium">
                            ~{item.estimatedImpressions > 0 ? item.estimatedImpressions.toLocaleString() : '1,500'} est. mo. demand
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Difficulty Score */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 hidden sm:block overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.difficulty > 70
                                ? 'bg-rose-500'
                                : item.difficulty > 40
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${item.difficulty}%` }}
                          />
                        </div>
                        <span
                          className={`font-bold ${
                            item.difficulty > 70
                              ? 'text-rose-600 dark:text-rose-400'
                              : item.difficulty > 40
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.difficulty}
                        </span>
                      </div>
                    </td>

                    {/* Opportunity Score (Highlighted) */}
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
                          isHighOpp
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                            : isMediumOpp
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {item.opportunityScore}
                      </span>
                    </td>

                    {/* Competing Apps Count */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {item.competingApps.toLocaleString()}
                    </td>

                    {/* Relevance */}
                    <td className="py-3.5 px-3 text-center">
                      <Badge variant={item.relevance === 'High' ? 'high' : item.relevance === 'Medium' ? 'medium' : 'low'}>
                        {item.relevance}
                      </Badge>
                    </td>

                    {/* Track Action */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => handleTrackKeyword(e, item)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                          trackedIds[item.id]
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                        title="Track keyword rank"
                      >
                        {trackedIds[item.id] ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px]">Tracked</span>
                          </>
                        ) : (
                          <>
                            <Target className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[10px]">Track</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Showing {sortedResults.length} keyword opportunities</span>
          <span>Tap any item to view top ranking competitors</span>
        </div>
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
