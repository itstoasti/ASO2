import React, { useState } from 'react';
import { CompetitorApp, CompetitorKeywordMatrixRow } from '@/lib/competitor-types';
import { TrackedApp } from '@/lib/rank-tracker-types';
import {
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Trophy,
  Target,
  Swords,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CompetitorKeywordMatrixProps {
  targetApp: TrackedApp;
  competitors: CompetitorApp[];
  matrixRows: CompetitorKeywordMatrixRow[];
  isLoading: boolean;
  onRefreshMatrix: () => void;
  onOpenAddCompetitor: () => void;
}

type MatrixFilterMode = 'all' | 'gaps' | 'winning' | 'battleground';

export function CompetitorKeywordMatrix({
  targetApp,
  competitors,
  matrixRows,
  isLoading,
  onRefreshMatrix,
  onOpenAddCompetitor,
}: CompetitorKeywordMatrixProps) {
  const [filterMode, setFilterMode] = useState<MatrixFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts for tabs
  const gapCount = matrixRows.filter((r) => r.isOpportunityGap).length;
  const winCount = matrixRows.filter((r) => r.isWinning).length;
  const battlegroundCount = matrixRows.filter((r) => r.isBattleground).length;

  const filteredRows = matrixRows.filter((row) => {
    // 1. Text filter
    if (searchQuery.trim() && !row.keyword.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return false;
    }

    // 2. Mode filter
    if (filterMode === 'gaps') return row.isOpportunityGap;
    if (filterMode === 'winning') return row.isWinning;
    if (filterMode === 'battleground') return row.isBattleground;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Control Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>All Tracked</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterMode === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {matrixRows.length}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('gaps')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterMode === 'gaps'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Keyword Gaps</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterMode === 'gaps' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {gapCount}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('winning')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterMode === 'winning'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>You Win</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterMode === 'winning' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {winCount}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('battleground')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterMode === 'battleground'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Shared Top 10</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterMode === 'battleground' ? 'bg-purple-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {battlegroundCount}
            </span>
          </button>
        </div>

        {/* Right Search & Refresh Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keyword..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={onRefreshMatrix}
            disabled={isLoading}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors shrink-0 disabled:opacity-50"
            title="Refresh live competitor ranks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header */}
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 min-w-[180px]">Tracked Keyword</th>
                <th className="py-3 px-3 w-28">Volume / Demand</th>
                <th className="py-3 px-3 w-24">Difficulty</th>
                
                {/* Your App Column */}
                <th className="py-3 px-4 min-w-[140px] bg-blue-50/50 dark:bg-blue-950/20 border-l border-r border-blue-200/60 dark:border-blue-900/60">
                  <div className="flex items-center gap-2">
                    {targetApp.iconUrl ? (
                      <img
                        src={targetApp.iconUrl}
                        alt={targetApp.name}
                        className="w-5 h-5 rounded-md object-cover"
                      />
                    ) : null}
                    <span className="truncate font-black text-blue-700 dark:text-blue-300">
                      {targetApp.name} (You)
                    </span>
                  </div>
                </th>

                {/* Competitor Columns */}
                {competitors.map((comp) => (
                  <th key={comp.id} className="py-3 px-4 min-w-[140px] border-r border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {comp.iconUrl ? (
                        <img
                          src={comp.iconUrl}
                          alt={comp.name}
                          className="w-5 h-5 rounded-md object-cover"
                        />
                      ) : null}
                      <span className="truncate text-slate-700 dark:text-slate-300" title={comp.name}>
                        {comp.name}
                      </span>
                    </div>
                  </th>
                ))}

                {competitors.length < 5 && (
                  <th className="py-3 px-3 w-28 text-center">
                    <button
                      onClick={onOpenAddCompetitor}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Add App
                    </button>
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + competitors.length}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    {matrixRows.length === 0 ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-500 dark:text-slate-400">
                          No keywords tracked for this application yet.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Add keywords in the Rank Tracker or use the Competitor Spy button to import keywords.
                        </p>
                      </div>
                    ) : (
                      <p>No keywords found matching the selected filter.</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Keyword Title & Gap Indicator */}
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{row.keyword}</span>
                        {row.isOpportunityGap && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-tight">
                            Gap
                          </span>
                        )}
                        {row.isWinning && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-tight">
                            Win
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Search Volume */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, row.searchPopularity)}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {row.searchPopularity}
                        </span>
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3 px-3">
                      <span className={`font-bold ${
                        row.difficulty <= 35
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.difficulty <= 65
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {row.difficulty} / 100
                      </span>
                    </td>

                    {/* Target App Rank (Highlighted) */}
                    <td className="py-3 px-4 bg-blue-50/30 dark:bg-blue-950/10 border-l border-r border-blue-200/60 dark:border-blue-900/60">
                      {row.myRank !== null ? (
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs ${
                            row.myRank <= 3
                              ? 'bg-emerald-500 text-white'
                              : row.myRank <= 10
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          #{row.myRank}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">&gt;50</span>
                      )}
                    </td>

                    {/* Competitor Ranks */}
                    {competitors.map((comp) => {
                      const compCheck = row.competitorRanks.find((c) => c.competitorId === comp.id);
                      const rank = compCheck ? compCheck.rank : null;

                      // Comparison badge styling
                      const isBetterThanMe = rank !== null && (row.myRank === null || rank < row.myRank);
                      const isWorseThanMe = row.myRank !== null && (rank === null || rank > row.myRank);

                      return (
                        <td
                          key={comp.id}
                          className="py-3 px-4 border-r border-slate-200/60 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            {rank !== null ? (
                              <span
                                className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  rank <= 3
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black'
                                    : rank <= 10
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                #{rank}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium">&gt;50</span>
                            )}

                            {/* Relative Delta Pill */}
                            {rank !== null && row.myRank !== null ? (
                              <span className="text-[10px] font-bold">
                                {isWorseThanMe ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    +{rank - row.myRank}
                                  </span>
                                ) : isBetterThanMe ? (
                                  <span className="text-rose-600 dark:text-rose-400">
                                    -{row.myRank - rank}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">=</span>
                                )}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}

                    {competitors.length < 5 && <td className="py-3 px-3" />}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
