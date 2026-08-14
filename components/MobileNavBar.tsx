'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Swords, Target, Key, ShieldCheck } from 'lucide-react';
import { ViewMode } from './FilterBar';

interface MobileNavBarProps {
  viewMode?: ViewMode;
  onViewChange?: (mode: ViewMode) => void;
  onToggleFilters?: () => void;
  hasActiveFilters?: boolean;
  onOpenAsaModal: () => void;
  asaConfigured: boolean;
  onScrollToSearch?: () => void;
  activeTab?: 'research' | 'tracker' | 'competitors';
}

export function MobileNavBar({
  onOpenAsaModal,
  asaConfigured,
  activeTab = 'research',
}: MobileNavBarProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      <div className="grid grid-cols-4 items-center h-14 px-2">
        {/* 1. Research Tab */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center h-full rounded-xl active:scale-95 transition-all cursor-pointer ${
            activeTab === 'research'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'research' ? 'bg-blue-50 dark:bg-blue-950/60' : ''
            }`}
          >
            <Search className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Research</span>
        </Link>

        {/* 2. Rank Tracker Tab */}
        <Link
          href="/rank-tracker"
          className={`flex flex-col items-center justify-center h-full rounded-xl active:scale-95 transition-all cursor-pointer ${
            activeTab === 'tracker'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'tracker' ? 'bg-blue-50 dark:bg-blue-950/60' : ''
            }`}
          >
            <Target className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Rankings</span>
        </Link>

        {/* 3. Competitors Tab */}
        <Link
          href="/competitors"
          className={`flex flex-col items-center justify-center h-full rounded-xl active:scale-95 transition-all cursor-pointer ${
            activeTab === 'competitors'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'competitors' ? 'bg-blue-50 dark:bg-blue-950/60' : ''
            }`}
          >
            <Swords className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Competitors</span>
        </Link>

        {/* 4. ASA API / Settings */}
        <button
          type="button"
          onClick={onOpenAsaModal}
          className="flex flex-col items-center justify-center h-full rounded-xl active:scale-95 transition-all cursor-pointer text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200"
        >
          <div className="p-1 rounded-lg relative">
            {asaConfigured ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            {asaConfigured && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            {asaConfigured ? 'ASA Active' : 'ASA Keys'}
          </span>
        </button>
      </div>
    </nav>
  );
}
