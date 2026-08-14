'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Swords, Target } from 'lucide-react';

interface MobileNavBarProps {
  activeTab?: 'research' | 'tracker' | 'competitors';
}

export function MobileNavBar({
  activeTab = 'research',
}: MobileNavBarProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      <div className="grid grid-cols-3 items-center h-14 px-4 max-w-md mx-auto">
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
            className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'research' ? 'bg-blue-50 dark:bg-blue-950/60' : ''
            }`}
          >
            <Search className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Research</span>
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
            className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'tracker' ? 'bg-blue-50 dark:bg-blue-950/60' : ''
            }`}
          >
            <Target className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Rank Tracker</span>
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
            className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'competitors' ? 'bg-blue-50 dark:bg-blue-950/60' : ''
            }`}
          >
            <Swords className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Competitors</span>
        </Link>
      </div>
    </nav>
  );
}
