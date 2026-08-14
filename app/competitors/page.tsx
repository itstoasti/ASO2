'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { CompetitorView } from '@/components/CompetitorView';
import { AsaConfigModal } from '@/components/AsaConfigModal';
import { MobileNavBar } from '@/components/MobileNavBar';
import { AsaCredentials } from '@/lib/types';
import { getTrackedKeywords } from '@/lib/rank-tracker-storage';

export default function CompetitorsPage() {
  const [asaCredentials, setAsaCredentials] = useState<AsaCredentials | null>(null);
  const [isAsaModalOpen, setIsAsaModalOpen] = useState(false);
  const [trackedCount, setTrackedCount] = useState(0);

  useEffect(() => {
    const kws = getTrackedKeywords();
    setTrackedCount(kws.length);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-16 sm:pb-0">
      <Header
        onOpenAsaModal={() => setIsAsaModalOpen(true)}
        asaConfigured={!!asaCredentials}
        activeTab="competitors"
        trackedCount={trackedCount}
      />

      <main className="flex-1">
        <CompetitorView />
      </main>

      <AsaConfigModal
        isOpen={isAsaModalOpen}
        onClose={() => setIsAsaModalOpen(false)}
        onSaveCredentials={(creds) => setAsaCredentials(creds)}
        initialCredentials={asaCredentials}
      />

      <MobileNavBar
        viewMode="grid"
        onViewChange={() => {}}
        onToggleFilters={() => {}}
        hasActiveFilters={false}
        onOpenAsaModal={() => setIsAsaModalOpen(true)}
        asaConfigured={!!asaCredentials}
        onScrollToSearch={() => {}}
        activeTab="competitors"
      />
    </div>
  );
}
