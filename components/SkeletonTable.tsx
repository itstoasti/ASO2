import React from 'react';

export function SkeletonTable() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
              </div>

              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse hidden sm:block"></div>
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
