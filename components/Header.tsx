import React from 'react';
import Link from 'next/link';
import { Key, ShieldCheck, HelpCircle, BarChart2, Search, Target } from 'lucide-react';
import { Badge } from './Badge';

interface HeaderProps {
  onOpenAsaModal?: () => void;
  asaConfigured?: boolean;
  activeTab?: 'research' | 'tracker';
  trackedCount?: number;
}

export function Header({
  activeTab = 'research',
  trackedCount = 0,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[56px] sm:h-16 flex items-center justify-between gap-3 py-2 sm:py-0 relative">
        
        {/* Brand Logo & Name (Left) */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 group cursor-pointer">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <img src="/logo-clean.png" alt="ASO Keyword Research" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-xs sm:text-base truncate">
                  ASO Keyword Research
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs (Centered) */}
        <nav className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold shadow-xs">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'research'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Keyword Research</span>
          </Link>

          <Link
            href="/rank-tracker"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'tracker'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Rank Tracker</span>
          </Link>
        </nav>

        {/* Right Spacer (Ensures exact centering) */}
        <div className="w-9 sm:w-44 shrink-0 pointer-events-none" />

      </div>
    </header>
  );
}

