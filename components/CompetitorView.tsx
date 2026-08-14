import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrackedApp } from '@/lib/rank-tracker-types';
import { CompetitorApp } from '@/lib/competitor-types';
import { getTrackedApps, saveTrackedApp, removeTrackedApp } from '@/lib/rank-tracker-storage';
import { getCachedCompetitors, saveCachedCompetitors } from '@/lib/competitor-storage';
import { CompetitorProfileView } from './CompetitorProfileView';
import { AddCompetitorModal } from './AddCompetitorModal';
import { AppSelectorModal } from './AppSelectorModal';
import {
  Apple,
  Play,
  Star,
  ChevronDown,
  Loader2,
  Layers,
  RefreshCw,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

const getCountryName = (code?: string) => {
  if (!code) return 'United States';
  const map: Record<string, string> = {
    us: 'United States',
    gb: 'United Kingdom',
    ca: 'Canada',
    au: 'Australia',
    de: 'Germany',
    fr: 'France',
    jp: 'Japan',
    kr: 'South Korea',
    br: 'Brazil',
    es: 'Spain',
    it: 'Italy',
  };
  return map[code.toLowerCase()] || code.toUpperCase();
};

function formatLastScanned(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Scanned just now';
  if (diffMinutes < 60) return `Scanned ${diffMinutes}m ago`;
  if (diffHours < 24) return `Scanned ${diffHours}h ago`;
  return `Scanned ${date.toLocaleDateString()}`;
}

export function CompetitorView() {
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<(TrackedApp & Partial<CompetitorApp>) | null>(null);
  const [discoveredCompetitors, setDiscoveredCompetitors] = useState<CompetitorApp[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorApp | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);

  const [isAddCompetitorModalOpen, setIsAddCompetitorModalOpen] = useState(false);
  const [isAppSelectorModalOpen, setIsAppSelectorModalOpen] = useState(false);

  // 1. Load initial apps from localStorage
  useEffect(() => {
    const loadedApps = getTrackedApps();
    setApps(loadedApps);
    if (loadedApps.length > 0) {
      setSelectedApp(loadedApps[0]);
    } else {
      setSelectedApp(null);
    }
  }, []);

  // 2. Auto-discover closest competitors with 24-hour persistent cache
  const discoverCompetitors = useCallback(async (app: TrackedApp & Partial<CompetitorApp>, force = false) => {
    if (!app || !app.id) return;

    // Check 24-hour local cache first unless user explicitly requested a manual Re-scan
    if (!force) {
      const cached = getCachedCompetitors(app.id, app.platform || 'ios', app.country || 'us');
      if (cached && cached.isFresh && cached.competitors.length > 0) {
        setDiscoveredCompetitors(cached.competitors);
        setSelectedCompetitor(cached.competitors[0]);
        setLastScannedAt(cached.lastScannedAt);
        setIsDiscovering(false);
        return;
      }
    }

    setIsDiscovering(true);

    try {
      const res = await fetch('/api/discover-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetApp: app }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.competitors && Array.isArray(data.competitors)) {
          const top8 = data.competitors.slice(0, 8);
          setDiscoveredCompetitors(top8);
          if (top8.length > 0) {
            setSelectedCompetitor(top8[0]);
          }
          const nowIso = new Date().toISOString();
          setLastScannedAt(nowIso);
          saveCachedCompetitors(app.id, app.platform || 'ios', top8, app.country || 'us');
        }
      }
    } catch (err) {
      console.error('Error discovering competitors:', err);
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  useEffect(() => {
    if (selectedApp) {
      discoverCompetitors(selectedApp, false);
    }
  }, [selectedApp, discoverCompetitors]);

  const handleAddManualCompetitor = (competitor: CompetitorApp) => {
    setDiscoveredCompetitors((prev) => {
      const updated = [competitor, ...prev.filter((c) => c.id !== competitor.id)].slice(0, 8);
      if (selectedApp) {
        saveCachedCompetitors(selectedApp.id, selectedApp.platform || 'ios', updated, selectedApp.country || 'us');
      }
      return updated;
    });
    setSelectedCompetitor(competitor);
  };

  const handleSelectAppFromModal = (app: TrackedApp) => {
    saveTrackedApp(app);
    const updated = getTrackedApps();
    setApps(updated);
    setSelectedApp(app);
  };

  const handleRemoveTrackedApp = (appId: string) => {
    if (!confirm('Are you sure you want to remove this tracked app?')) return;
    removeTrackedApp(appId);
    const remaining = getTrackedApps();
    setApps(remaining);
    if (remaining.length > 0) {
      setSelectedApp(remaining[0]);
    } else {
      setSelectedApp(null);
      setDiscoveredCompetitors([]);
      setSelectedCompetitor(null);
      setLastScannedAt(null);
    }
  };

  const linkedApp = selectedApp
    ? apps.find(
        (a) =>
          a.id !== selectedApp.id &&
          a.platform !== selectedApp.platform &&
          (a.name.toLowerCase().trim() === selectedApp.name.toLowerCase().trim() ||
           (a.developer && a.developer !== 'Developer' && a.developer.toLowerCase() === selectedApp.developer.toLowerCase()) ||
           a.name.toLowerCase().includes(selectedApp.name.toLowerCase().substring(0, 5)))
      )
    : null;

  if (apps.length === 0 || !selectedApp) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Apps Tracked Yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Track your iOS or Android app to automatically discover your top direct competitors and spy on their keywords, screenshots, and store copy.
          </p>
          <button
            onClick={() => setIsAppSelectorModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            + Add Your App
          </button>
        </div>

        <AppSelectorModal
          isOpen={isAppSelectorModalOpen}
          onClose={() => setIsAppSelectorModalOpen(false)}
          apps={apps}
          selectedApp={selectedApp}
          onSelectApp={handleSelectAppFromModal}
          onOpenAddApp={() => {}}
          onRemoveApp={handleRemoveTrackedApp}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Sleek App Profile Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* App Identity (Left) */}
          <div className="flex items-center gap-3.5 min-w-0">
            {selectedApp.iconUrl ? (
              <img
                src={selectedApp.iconUrl}
                alt={selectedApp.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200/80 dark:border-slate-700/80 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                {selectedApp.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 space-y-0.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {selectedApp.name}
              </h1>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                {selectedApp.developer && selectedApp.developer !== 'Developer' && (
                  <span>by <strong className="font-medium text-slate-700 dark:text-slate-300">{selectedApp.developer}</strong></span>
                )}
                {selectedApp.category && (
                  <>
                    <span>·</span>
                    <span>{selectedApp.category}</span>
                  </>
                )}
                <span>·</span>
                <span>{getCountryName(selectedApp.country)} Store</span>
              </div>
            </div>
          </div>

          {/* Integrated Controls (Right) */}
          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            {/* Store Segmented Switcher (iOS / Android) */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  if (selectedApp.platform !== 'ios') {
                    if (linkedApp && linkedApp.platform === 'ios') {
                      setSelectedApp(linkedApp);
                    } else {
                      const updated = { ...selectedApp, platform: 'ios' as const };
                      setSelectedApp(updated);
                    }
                  }
                }}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedApp.platform === 'ios'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Apple className="w-3.5 h-3.5 text-sky-600" />
                <span>iOS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedApp.platform !== 'android') {
                    if (linkedApp && linkedApp.platform === 'android') {
                      setSelectedApp(linkedApp);
                    } else {
                      const updated = { ...selectedApp, platform: 'android' as const };
                      setSelectedApp(updated);
                    }
                  }
                }}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedApp.platform === 'android'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                <span>Android</span>
              </button>
            </div>

            {/* App Switcher Button */}
            <button
              type="button"
              onClick={() => setIsAppSelectorModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200/70 dark:border-slate-700/70 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Switch App</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Top 8 Competitors Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Top Competitors
            </h3>
            {isDiscovering && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Scanning...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastScannedAt && !isDiscovering && (
              <span className="text-[11px] text-slate-400 font-normal hidden sm:inline-block">
                {formatLastScanned(lastScannedAt)} (cached 24h)
              </span>
            )}

            <button
              onClick={() => discoverCompetitors(selectedApp, true)}
              disabled={isDiscovering}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              title="Force fresh scan for competitor apps"
            >
              <RefreshCw className={`w-3 h-3 ${isDiscovering ? 'animate-spin' : ''}`} />
              <span>Re-scan</span>
            </button>
          </div>
        </div>

        {/* 4 x 2 Even Minimalist Grid */}
        {isDiscovering && discoveredCompetitors.length === 0 ? (
          <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Discovering top competitors in your niche...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {discoveredCompetitors.map((comp) => {
              const isSelected = selectedCompetitor?.id === comp.id;

              return (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompetitor(comp)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500/80 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                  }`}
                >
                  {comp.iconUrl ? (
                    <img
                      src={comp.iconUrl}
                      alt={comp.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 dark:border-slate-800 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                      {comp.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {comp.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {comp.rating ? (
                        <>
                          <span className="flex items-center text-amber-500 font-semibold">
                            ★ {comp.rating.toFixed(1)}
                          </span>
                          <span>·</span>
                        </>
                      ) : null}
                      <span className="truncate">
                        {comp.reviewCount >= 1000
                          ? `${(comp.reviewCount / 1000).toFixed(0)}k`
                          : comp.reviewCount || comp.installs || 'Tracked'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Competitor Profile Deep-Dive */}
      {selectedCompetitor && (
        <CompetitorProfileView
          competitor={selectedCompetitor}
          targetApp={selectedApp}
        />
      )}

      {/* Modals */}
      {selectedApp && (
        <AddCompetitorModal
          isOpen={isAddCompetitorModalOpen}
          onClose={() => setIsAddCompetitorModalOpen(false)}
          targetApp={selectedApp}
          onAddCompetitor={handleAddManualCompetitor}
          existingCompetitorIds={discoveredCompetitors.map((c) => c.id)}
        />
      )}

      <AppSelectorModal
        isOpen={isAppSelectorModalOpen}
        onClose={() => setIsAppSelectorModalOpen(false)}
        apps={apps}
        selectedApp={selectedApp}
        onSelectApp={handleSelectAppFromModal}
        onOpenAddApp={() => setIsAddCompetitorModalOpen(true)}
        onRemoveApp={handleRemoveTrackedApp}
      />
    </div>
  );
}
