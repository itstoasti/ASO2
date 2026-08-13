import React from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, LayoutGrid, Table, Copy, Key, ShieldCheck, Target } from 'lucide-react';
import { ViewMode } from './FilterBar';

interface MobileNavBarProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onOpenAsaModal: () => void;
  asaConfigured: boolean;
  onScrollToSearch: () => void;
  activeTab?: 'research' | 'tracker';
}

export function MobileNavBar({
  viewMode,
  onViewChange,
  onToggleFilters,
  hasActiveFilters,
  onOpenAsaModal,
  asaConfigured,
  onScrollToSearch,
  activeTab = 'research',
}: MobileNavBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 pb-safe shadow-lg">
      <div className="flex items-center justify-around h-14 px-2">
        {/* Research / Search Tab */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-14 h-full active:scale-90 transition-transform cursor-pointer ${
            activeTab === 'research' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Research</span>
        </Link>

        {/* Rank Tracker Tab */}
        <Link
          href="/rank-tracker"
          className={`flex flex-col items-center justify-center w-14 h-full active:scale-90 transition-transform cursor-pointer ${
            activeTab === 'tracker' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Target className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Tracker</span>
        </Link>

        {/* Filter Tab */}
        <button
          type="button"
          onClick={onToggleFilters}
          className="relative flex flex-col items-center justify-center w-14 h-full text-slate-500 dark:text-slate-400 active:scale-90 transition-transform cursor-pointer"
        >
          <div className="relative">
            <SlidersHorizontal className="w-5 h-5 mb-0.5" />
            {hasActiveFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight">Filters</span>
        </button>

        {/* Cards/Table View Tab */}
        <button
          type="button"
          onClick={() => onViewChange(viewMode === 'grid' ? 'table' : 'grid')}
          className={`flex flex-col items-center justify-center w-14 h-full active:scale-90 transition-transform cursor-pointer ${
            viewMode === 'grid' || viewMode === 'table'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          {viewMode === 'grid' ? (
            <LayoutGrid className="w-5 h-5 mb-0.5" />
          ) : (
            <Table className="w-5 h-5 mb-0.5" />
          )}
          <span className="text-[10px] tracking-tight">{viewMode === 'grid' ? 'Cards' : 'Table'}</span>
        </button>

        {/* ASA API Config Tab */}
        <button
          type="button"
          onClick={onOpenAsaModal}
          className="relative flex flex-col items-center justify-center w-14 h-full text-slate-500 dark:text-slate-400 active:scale-90 transition-transform cursor-pointer"
        >
          {asaConfigured ? (
            <ShieldCheck className="w-5 h-5 mb-0.5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Key className="w-5 h-5 mb-0.5" />
          )}
          <span className="text-[10px] font-medium tracking-tight">ASA API</span>
        </button>
      </div>
    </div>
  );
}
