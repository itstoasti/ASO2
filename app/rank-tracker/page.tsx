'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { RankTrackerView } from '@/components/RankTrackerView';
import { MobileNavBar } from '@/components/MobileNavBar';

export default function RankTrackerPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-16 sm:pb-0">
      <Header activeTab="tracker" />

      <main className="flex-1">
        <RankTrackerView />
      </main>

      <MobileNavBar activeTab="tracker" />
    </div>
  );
}
