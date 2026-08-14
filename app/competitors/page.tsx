'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { CompetitorView } from '@/components/CompetitorView';
import { MobileNavBar } from '@/components/MobileNavBar';

export default function CompetitorsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-16 sm:pb-0">
      <Header activeTab="competitors" />

      <main className="flex-1">
        <CompetitorView />
      </main>

      <MobileNavBar activeTab="competitors" />
    </div>
  );
}
