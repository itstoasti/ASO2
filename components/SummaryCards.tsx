import React from 'react';
import { ResearchResponse } from '@/lib/types';
import { Sparkles, TrendingUp, ShieldAlert, Award } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface SummaryCardsProps {
  data: ResearchResponse;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Discovered Keywords */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Keywords
              </span>
              <Tooltip align="left" content="Total unique keyword variations discovered from live store search suggestions." />
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {data.totalKeywords}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Discovered for seed term</p>
        </div>

        {/* Card 2: High Opportunity Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                High Opportunity
              </span>
              <Tooltip align="center" content="Keywords with an Opportunity Score >= 70 (Low competition difficulty paired with good search volume)." />
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {data.highOpportunityCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Opportunity Score ≥ 70</p>
        </div>

        {/* Card 3: Average Difficulty */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Avg Difficulty
              </span>
              <Tooltip align="center" content="Average competitive difficulty score across all discovered keywords in this seed category." />
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {data.avgDifficulty}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Competitive baseline</p>
        </div>

        {/* Card 4: Top Demand Keyword */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Top Demand Keyword
              </span>
              <Tooltip align="right" content="The keyword phrase with the absolute highest search volume/popularity in this dataset." />
            </div>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="truncate">
            <span className="text-lg font-black text-slate-900 dark:text-white truncate block">
              &quot;{data.topVolumeKeyword}&quot;
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Highest search volume</p>
        </div>
      </div>
    </div>
  );
}
