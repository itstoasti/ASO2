import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrackedApp, TrackedKeyword } from '@/lib/rank-tracker-types';
import {
  getTrackedApps,
  saveTrackedApp,
  removeTrackedApp,
  getTrackedKeywords,
  saveTrackedKeyword,
  removeTrackedKeyword,
} from '@/lib/rank-tracker-storage';
import { CountryCode, COUNTRIES, Platform } from '@/lib/types';
import { Badge } from './Badge';
import { Tooltip } from './Tooltip';
import { AppSelectorModal } from './AppSelectorModal';
import { AutoDetectModal } from './AutoDetectModal';
import { DiscoveredKeyword } from '@/app/api/auto-detect-keywords/route';
import { convertPopularityToImpressions, convertAndroidDemandToVolume } from '@/lib/scoring/impressions';
import {
  Target,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Search,
  Download,
  Apple,
  Play,
  Globe,
  Award,
  ChevronRight,
  ExternalLink,
  Info,
  X,
  Pencil,
  ArrowRight,
} from 'lucide-react';

interface RankTrackerViewProps {
  initialSeedKeyword?: string;
  initialCountry?: CountryCode;
  initialPlatform?: Platform;
}

function parseAppInputUrl(input: string, currentPlatform: Platform = 'ios', currentCountry: CountryCode = 'us') {
  const cleanInput = input.trim();
  if (!cleanInput) {
    return { id: '', name: '', developer: '', platform: currentPlatform, country: currentCountry };
  }

  // 1. Google Play Store URL
  if (cleanInput.includes('play.google.com')) {
    try {
      const urlStr = cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`;
      const url = new URL(urlStr);
      const appId = url.searchParams.get('id') || cleanInput;
      const parts = appId.split('.');
      const rawName = parts.length > 1 ? parts[parts.length - 1] : appId;
      const rawDev = parts.length > 2 ? parts[1] : 'Android Dev';
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const formattedDev = rawDev.charAt(0).toUpperCase() + rawDev.slice(1);

      return {
        id: appId,
        name: formattedName,
        developer: formattedDev,
        platform: 'android' as Platform,
        country: currentCountry,
      };
    } catch {
      return {
        id: cleanInput,
        name: cleanInput,
        developer: 'Android Dev',
        platform: 'android' as Platform,
        country: currentCountry,
      };
    }
  }

  // 2. Android Package Name (e.g. com.deanfieldz.yummy or com.duolingo)
  if (/^[a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+$/.test(cleanInput)) {
    const parts = cleanInput.split('.');
    const rawAppName = parts[parts.length - 1]; // "yummy" from com.deanfieldz.yummy
    const rawDevName = parts.length > 2 ? parts[1] : parts[0]; // "deanfieldz"
    const formattedName = rawAppName.charAt(0).toUpperCase() + rawAppName.slice(1);
    const formattedDev = rawDevName.charAt(0).toUpperCase() + rawDevName.slice(1);

    return {
      id: cleanInput,
      name: formattedName,
      developer: formattedDev,
      platform: 'android' as Platform,
      country: currentCountry,
    };
  }

  // 3. Apple App Store URL
  if (cleanInput.includes('apps.apple.com') || cleanInput.includes('itunes.apple.com')) {
    try {
      const urlStr = cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`;
      const url = new URL(urlStr);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      let country = currentCountry;
      let name = 'iOS App';
      let appId = cleanInput;

      if (pathParts.length >= 3 && pathParts[1] === 'app') {
        if (pathParts[0].length === 2) {
          country = pathParts[0].toLowerCase() as CountryCode;
        }
        const slugName = pathParts[2];
        name = slugName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const idPart = pathParts[3] || pathParts[2];
        const match = idPart.match(/id(\d+)/);
        if (match) appId = match[1];
      } else {
        const match = cleanInput.match(/id(\d+)/);
        if (match) appId = match[1];
      }

      return {
        id: appId,
        name,
        developer: 'iOS Developer',
        platform: 'ios' as Platform,
        country,
      };
    } catch {
      return {
        id: cleanInput,
        name: cleanInput,
        developer: 'iOS Developer',
        platform: 'ios' as Platform,
        country: currentCountry,
      };
    }
  }

  // 4. Fallback (Numeric iTunes ID or generic app name)
  const isNumeric = /^\d+$/.test(cleanInput);
  return {
    id: cleanInput,
    name: cleanInput,
    developer: 'App Developer',
    platform: isNumeric ? ('ios' as Platform) : (currentPlatform === 'both' ? 'ios' : currentPlatform),
    country: currentCountry,
  };
}

export function RankTrackerView({
  initialSeedKeyword = '',
  initialCountry = 'us',
  initialPlatform = 'ios',
}: RankTrackerViewProps) {
  // Apps & Selected App State
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<TrackedApp | null>(null);

  // Track enriched app IDs and auto-refreshed app IDs to prevent duplicate fetches or infinite loops
  const enrichedAppIdsRef = useRef<Set<string>>(new Set());
  const autoRefreshedAppsRef = useRef<Set<string>>(new Set());

  // App Input Form Modal & Edit App State
  const [targetAppInput, setTargetAppInput] = useState('');
  const [customAppName, setCustomAppName] = useState('');
  const [customDeveloper, setCustomDeveloper] = useState('');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [country, setCountry] = useState<CountryCode>(initialCountry);

  // Modal States
  const [isAddAppModalOpen, setIsAddAppModalOpen] = useState(false);
  const [isEditAppModalOpen, setIsEditAppModalOpen] = useState(false);
  const [isAppSelectorModalOpen, setIsAppSelectorModalOpen] = useState(false);
  const [isAutoDetectModalOpen, setIsAutoDetectModalOpen] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  const [trackedKeywords, setTrackedKeywords] = useState<TrackedKeyword[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  // Load initial apps from localStorage on mount
  useEffect(() => {
    const loadedApps = getTrackedApps();
    setApps(loadedApps);

    if (loadedApps.length > 0) {
      setSelectedApp(loadedApps[0]);
    } else {
      setSelectedApp(null);
    }
  }, []);

  // Load keywords when selected app changes
  const loadKeywords = useCallback(() => {
    if (!selectedApp) {
      setTrackedKeywords([]);
      return;
    }
    const allKeywords = getTrackedKeywords();
    const appKeywords = allKeywords.filter((k) => k.targetAppId === selectedApp.id);
    const normalized = appKeywords.map((k) => ({
      ...k,
      platform: selectedApp.platform,
    }));
    setTrackedKeywords(normalized);
  }, [selectedApp]);

  // Batch add auto-detected organic keywords
  const handleAddDiscoveredKeywords = useCallback((discoveredList: DiscoveredKeyword[]) => {
    if (!selectedApp) return;
    discoveredList.forEach((item) => {
      const newKw: TrackedKeyword = {
        id: `${selectedApp.id}_${item.keyword.toLowerCase().trim()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        targetAppId: selectedApp.id,
        keyword: item.keyword,
        country: selectedApp.country,
        platform: selectedApp.platform,
        searchPopularity: item.searchPopularity,
        difficulty: item.difficulty,
        competingApps: item.competingApps,
        currentRank: item.rank,
        previousRank: null,
        rankDelta: 0,
        lastCheckedAt: new Date().toISOString(),
      };
      saveTrackedKeyword(newKw);
    });
    loadKeywords();
  }, [selectedApp, loadKeywords]);

  useEffect(() => {
    loadKeywords();

    // Auto-refresh stale rank data (> 24 hours old)
    if (!selectedApp) return;
    const appId = selectedApp.id;
    if (autoRefreshedAppsRef.current.has(appId)) return;

    const currentKwList = getTrackedKeywords().filter((k) => k.targetAppId === appId);
    if (currentKwList.length === 0) return;

    const now = Date.now();
    const isStale = currentKwList.some((k) => {
      if (!k.lastCheckedAt) return true;
      return now - new Date(k.lastCheckedAt).getTime() > 24 * 60 * 60 * 1000;
    });

    if (isStale) {
      autoRefreshedAppsRef.current.add(appId);
      const kwNames = currentKwList.map((k) => k.keyword);
      checkRanksForKeywords(kwNames, selectedApp);
    }
  }, [selectedApp, loadKeywords]);

  // Automatic Background App Metadata Enrichment Effect (Guarded against stale closures & loops)
  useEffect(() => {
    if (!selectedApp) return;

    const appIdToEnrich = selectedApp.id;

    // Check if already enriched in this session
    if (enrichedAppIdsRef.current.has(appIdToEnrich)) return;

    // Check if app needs enrichment (missing icon or fallback title)
    const needsEnrichment = !selectedApp.iconUrl || selectedApp.name.toLowerCase().includes('yummy') || selectedApp.name === selectedApp.id || selectedApp.name.startsWith('com.');

    if (needsEnrichment) {
      enrichedAppIdsRef.current.add(appIdToEnrich);

      fetch('/api/app-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appIdToEnrich,
          platform: selectedApp.platform,
          country: selectedApp.country,
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (!data || !data.name) return;

          // Verify app was not deleted while request was in-flight!
          const currentStoredApps = getTrackedApps();
          const exists = currentStoredApps.some((a) => a.id === appIdToEnrich);
          if (!exists) return; // Do NOT resurrect deleted apps

          const enriched: TrackedApp = {
            id: appIdToEnrich,
            name: data.name,
            developer: data.developer || selectedApp.developer,
            iconUrl: data.iconUrl || selectedApp.iconUrl,
            platform: selectedApp.platform,
            country: selectedApp.country,
            addedAt: selectedApp.addedAt || new Date().toISOString(),
          };

          saveTrackedApp(enriched);
          const updatedList = getTrackedApps();
          setApps(updatedList);

          // Only update selectedApp if user hasn't switched to another app
          setSelectedApp((curr) => (curr && curr.id === appIdToEnrich ? enriched : curr));
        })
        .catch((err) => console.error('Enrichment error:', err));
    }
  }, [selectedApp]);

  // Auto-fetch store metadata when URL or ID changes
  const fetchStoreMetadata = async (appIdStr: string, storePlatform: Platform, storeCountry: CountryCode) => {
    if (!appIdStr.trim()) return;
    setIsFetchingMetadata(true);
    try {
      const res = await fetch('/api/app-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appIdStr.trim(),
          platform: storePlatform,
          country: storeCountry,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.name) setCustomAppName(data.name);
        if (data.developer) setCustomDeveloper(data.developer);
        if (data.iconUrl) setCustomIconUrl(data.iconUrl);
      }
    } catch (err) {
      console.error('Store lookup error:', err);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  // Handle URL / Text input change with live auto-detection
  const handleAppInputChange = (val: string) => {
    setTargetAppInput(val);
    if (val.trim()) {
      const parsed = parseAppInputUrl(val, platform, country);
      setPlatform(parsed.platform);
      if (parsed.country) setCountry(parsed.country);

      if (parsed.name && parsed.name !== parsed.id) {
        setCustomAppName(parsed.name);
      }
      if (parsed.developer) {
        setCustomDeveloper(parsed.developer);
      }

      fetchStoreMetadata(parsed.id, parsed.platform, parsed.country || country);
    }
  };

  // Open Edit App Modal
  const openEditAppModal = () => {
    if (!selectedApp) return;
    setTargetAppInput(selectedApp.id);
    setCustomAppName(selectedApp.name);
    setCustomDeveloper(selectedApp.developer);
    setCustomIconUrl(selectedApp.iconUrl || '');
    setPlatform(selectedApp.platform);
    setCountry(selectedApp.country);
    setIsEditAppModalOpen(true);
  };

  // Open Add App Modal
  const openAddAppModal = () => {
    setTargetAppInput('');
    setCustomAppName('');
    setCustomDeveloper('');
    setCustomIconUrl('');
    setIsAddAppModalOpen(true);
  };

  // Add new app handler with live store API metadata lookup
  const handleAddApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAppInput.trim()) return;

    setIsAdding(true);
    const parsed = parseAppInputUrl(targetAppInput, platform, country);

    let newApp: TrackedApp = {
      id: parsed.id,
      name: customAppName.trim() || parsed.name || parsed.id,
      developer: customDeveloper.trim() || parsed.developer || 'Developer',
      iconUrl: customIconUrl.trim() || undefined,
      platform: parsed.platform === 'both' ? 'ios' : parsed.platform,
      country: parsed.country || country,
      addedAt: new Date().toISOString(),
    };

    // Always fetch live store metadata from API
    try {
      const res = await fetch('/api/app-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: parsed.id,
          platform: parsed.platform,
          country: parsed.country || country,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          newApp = {
            ...newApp,
            id: data.id || newApp.id,
            name: customAppName.trim() || data.name,
            developer: customDeveloper.trim() || data.developer || newApp.developer,
            iconUrl: customIconUrl.trim() || data.iconUrl || newApp.iconUrl,
            platform: (data.platform === 'both' ? 'ios' : data.platform) || newApp.platform,
          };
        }
      }
    } catch (err) {
      console.error('Store lookup error:', err);
    } finally {
      setIsAdding(false);
    }

    saveTrackedApp(newApp);
    const updatedApps = getTrackedApps();
    setApps(updatedApps);
    setSelectedApp(newApp);
    setTargetAppInput('');
    setCustomAppName('');
    setCustomDeveloper('');
    setCustomIconUrl('');
    setIsAddAppModalOpen(false);
  };

  // Save edited app handler
  const handleSaveEditedApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !customAppName.trim()) return;

    const updatedApp: TrackedApp = {
      ...selectedApp,
      name: customAppName.trim(),
      developer: customDeveloper.trim() || selectedApp.developer,
      iconUrl: customIconUrl.trim() || undefined,
      platform: platform === 'both' ? 'ios' : platform,
      country,
    };

    saveTrackedApp(updatedApp);
    const updatedApps = getTrackedApps();
    setApps(updatedApps);
    setSelectedApp(updatedApp);
    setIsEditAppModalOpen(false);
  };

  // Remove app handler
  const handleRemoveApp = (appId: string) => {
    if (!confirm('Are you sure you want to remove this app and all its tracked keywords?')) return;
    removeTrackedApp(appId);
    const remaining = getTrackedApps();
    setApps(remaining);
    if (remaining.length > 0) {
      setSelectedApp(remaining[0]);
    } else {
      setSelectedApp(null);
      setTrackedKeywords([]);
    }
  };

  // Execute Rank Check API for a list of keywords
  const checkRanksForKeywords = async (kwList: string[], app: TrackedApp) => {
    if (!app || kwList.length === 0) return;

    setIsRefreshing(true);
    try {
      const res = await fetch('/api/rank-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: app.id,
          keywords: kwList,
          platform: app.platform,
          country: app.country,
        }),
      });

      if (!res.ok) throw new Error('Rank check failed.');

      const data = await res.json();
      const currentKeywords = getTrackedKeywords();

      for (const item of data.results) {
        const existing = currentKeywords.find(
          (k) => k.keyword.toLowerCase() === item.keyword.toLowerCase() && k.targetAppId === app.id
        );

        const newRank = item.rank;
        const prevRank = existing ? existing.currentRank : null;
        let delta: number | null = null;

        if (existing && prevRank !== null && newRank !== null) {
          delta = prevRank - newRank; // positive = improved rank position (e.g. 5 -> 3 = +2)
        }

        const updatedKeyword: TrackedKeyword = {
          id: existing?.id || `kw_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          keyword: item.keyword,
          platform: app.platform,
          country: app.country,
          targetAppId: app.id,
          currentRank: newRank,
          previousRank: prevRank,
          rankDelta: delta,
          searchPopularity: item.searchPopularity,
          difficulty: item.difficulty,
          competingApps: item.competingApps,
          top3Competitors: item.top3Competitors,
          lastCheckedAt: new Date().toISOString(),
        };

        saveTrackedKeyword(updatedKeyword);
      }

      loadKeywords();
    } catch (err) {
      console.error('Failed to update ranks:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add new keyword handler
  const handleAddKeywords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordInput.trim() || !selectedApp) return;

    const parsedKeywords = newKeywordInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (parsedKeywords.length === 0) return;

    setIsAdding(true);
    await checkRanksForKeywords(parsedKeywords, selectedApp);
    setNewKeywordInput('');
    setIsAdding(false);
  };

  // Delete keyword
  const handleDeleteKeyword = (id: string) => {
    removeTrackedKeyword(id);
    loadKeywords();
  };

  // Refresh all ranks
  const handleRefreshAll = () => {
    if (!selectedApp || trackedKeywords.length === 0) return;
    const kwNames = trackedKeywords.map((k) => k.keyword);
    checkRanksForKeywords(kwNames, selectedApp);
  };

  // CSV Export
  const exportCsv = () => {
    if (!trackedKeywords || trackedKeywords.length === 0) return;

    const headers = ['Keyword', 'Current Rank', 'Previous Rank', 'Delta', 'Search Popularity', 'Difficulty', 'Competing Apps', 'Last Checked'];
    const rows = trackedKeywords.map((k) => [
      `"${k.keyword.replace(/"/g, '""')}"`,
      k.currentRank ? `#${k.currentRank}` : 'Unranked (>50)',
      k.previousRank ? `#${k.previousRank}` : 'N/A',
      k.rankDelta !== null ? (k.rankDelta > 0 ? `+${k.rankDelta}` : `${k.rankDelta}`) : '0',
      k.searchPopularity,
      k.difficulty,
      k.competingApps,
      k.lastCheckedAt ? new Date(k.lastCheckedAt).toLocaleDateString() : 'Just now',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aso_ranks_${selectedApp?.name || 'app'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Calculate Metrics
  const totalTracked = trackedKeywords.length;
  const top5Count = trackedKeywords.filter((k) => k.currentRank !== null && k.currentRank <= 5).length;
  const top10Count = trackedKeywords.filter((k) => k.currentRank !== null && k.currentRank <= 10).length;

  // Visibility Index: Sum of (Search Popularity * Weight) for ranked keywords
  const visibilityScore = Math.round(
    trackedKeywords.reduce((acc, k) => {
      if (!k.currentRank) return acc;
      const weight = k.currentRank <= 3 ? 1.0 : k.currentRank <= 10 ? 0.6 : k.currentRank <= 20 ? 0.3 : 0.1;
      return acc + k.searchPopularity * weight;
    }, 0)
  );

  const filteredList = trackedKeywords.filter((k) =>
    k.keyword.toLowerCase().includes(filterQuery.toLowerCase().trim())
  );

  // Find linked opposite platform version of this app (Android <-> iOS)
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* App Info & Avatar */}
          <div className="flex items-center gap-3 min-w-0">
            {selectedApp?.iconUrl ? (
              <img
                src={selectedApp.iconUrl}
                alt={selectedApp.name}
                className="w-11 h-11 rounded-2xl object-cover shadow-md shadow-slate-300/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-black flex items-center justify-center text-lg shadow-md shadow-blue-500/20 shrink-0">
                {selectedApp?.name.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {selectedApp?.name || 'No App Selected'}
                </h1>
                {selectedApp && (
                  <Badge variant={selectedApp.platform === 'ios' ? 'ios' : 'android'}>
                    {selectedApp.platform === 'ios' ? (
                      <>
                        <Apple className="w-3 h-3" /> iOS
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-emerald-600" /> Android
                      </>
                    )}
                  </Badge>
                )}

                {/* Compact Store Segmented Pill Switcher */}
                {selectedApp && (
                  <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs">
                    {/* iOS Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedApp.platform !== 'ios') {
                          if (linkedApp && linkedApp.platform === 'ios') {
                            setSelectedApp(linkedApp);
                          } else {
                            setPlatform('ios');
                            setCustomAppName(selectedApp.name);
                            setCustomDeveloper(selectedApp.developer);
                            setTargetAppInput('');
                            setIsAddAppModalOpen(true);
                          }
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                        selectedApp.platform === 'ios'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Apple className="w-3 h-3 text-sky-600" />
                      <span>iOS</span>
                      {selectedApp.platform !== 'ios' && !linkedApp && <span className="text-[10px] text-slate-400 font-normal">+</span>}
                    </button>

                    {/* Android Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedApp.platform !== 'android') {
                          if (linkedApp && linkedApp.platform === 'android') {
                            setSelectedApp(linkedApp);
                          } else {
                            setPlatform('android');
                            setCustomAppName(selectedApp.name);
                            setCustomDeveloper(selectedApp.developer);
                            setTargetAppInput('');
                            setIsAddAppModalOpen(true);
                          }
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                        selectedApp.platform === 'android'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                      <span>Android</span>
                      {selectedApp.platform !== 'android' && !linkedApp && <span className="text-[10px] text-slate-400 font-normal">+</span>}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                {selectedApp?.developer && selectedApp.developer !== 'Developer' && selectedApp.developer !== 'Android Developer' && (
                  <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1.5">
                    by {selectedApp.developer} ·
                  </span>
                )}
                ID: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedApp?.id}</span> · Country:{' '}
                <span className="uppercase font-bold text-slate-700 dark:text-slate-300">{selectedApp?.country}</span>
              </p>
            </div>
          </div>

          {/* Minimal Controls: Switch App Modal Trigger & Add App */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {apps.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAppSelectorModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Switch App ({apps.length})</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
              </button>
            )}

            {/* "+ Add App" Button */}
            <button
              onClick={() => setIsAddAppModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add App</span>
            </button>

            {/* Remove Selected App Button */}
            {selectedApp && (
              <button
                onClick={() => handleRemoveApp(selectedApp.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer shrink-0"
                title="Remove current app from rank tracker"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Keywords */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tracked Keywords
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalTracked}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Actively monitored terms</p>
        </div>

        {/* Card 2: Top 5 Rankings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Top 5 Positions
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {top5Count}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">High conversion search positions</p>
        </div>

        {/* Card 3: Top 10 Rankings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Top 10 Positions
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {top10Count}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">First-page store visibility</p>
        </div>

        {/* Card 4: Store Visibility Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Visibility Index
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {visibilityScore}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Combined organic search reach</p>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Add Keyword Form */}
        <form onSubmit={handleAddKeywords} className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={newKeywordInput}
              onChange={(e) => setNewKeywordInput(e.target.value)}
              placeholder="Add keywords to track (e.g. fitness, workout tracker)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newKeywordInput.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Analyzing...' : 'Add Keyword'}</span>
          </button>

          {/* Auto-Detect Organic Keywords Trigger */}
          <button
            type="button"
            onClick={() => setIsAutoDetectModalOpen(true)}
            disabled={!selectedApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-50"
            title="Auto-scan live App Store & Google Play index for organic keywords your app ranks for"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Auto-Detect Keywords</span>
          </button>
        </form>

        {/* Toolbar Controls: Search Filter, Refresh & Export */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Quick List Filter */}
          <div className="relative w-40">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter list..."
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Refresh Ranks Button */}
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing || trackedKeywords.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all disabled:opacity-40 cursor-pointer"
            title="Re-check live store rankings for all tracked keywords"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={exportCsv}
            disabled={trackedKeywords.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Main Tracked Keywords Table */}
      {filteredList.length === 0 ? (
        <div className="w-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Tracked Keywords Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Type a keyword above or click &quot;Track Rank&quot; on any keyword in the Research page to start monitoring your store positions.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/40 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Keyword</th>
                  <th className="py-3.5 px-4 text-center">Store Rank</th>
                  <th className="py-3.5 px-4 text-center">
                    <Tooltip content="Change in store rank position since last check or initial tracking">
                      <span className="inline-flex items-center gap-1 cursor-help">
                        Rank Change
                        <Info className="w-3 h-3 text-slate-400" />
                      </span>
                    </Tooltip>
                  </th>
                  <th className="py-3.5 px-4 text-right">Volume / Demand</th>
                  <th className="py-3.5 px-4 text-right">Difficulty</th>
                  <th className="py-3.5 px-4 text-right">Competing Apps</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {filteredList.map((item) => {
                  const rank = item.currentRank;
                  const delta = item.rankDelta;

                  const estVolume = item.platform === 'android'
                    ? convertAndroidDemandToVolume(item.searchPopularity)
                    : convertPopularityToImpressions(item.searchPopularity);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Keyword Title */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {item.keyword}
                      </td>

                      {/* Rank Position Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {rank === null ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Unranked (&gt;50)
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-black border ${
                              rank <= 5
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                                : rank <= 10
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                : rank <= 30
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                          >
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Rank Change Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {delta === null || delta === 0 ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] font-semibold">
                            <Minus className="w-3 h-3 text-slate-300" />
                            <span>No change</span>
                          </span>
                        ) : delta > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 text-xs">
                            <TrendingUp className="w-3.5 h-3.5" /> +{delta} spot{delta === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-extrabold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60 text-xs">
                            <TrendingDown className="w-3.5 h-3.5" /> {delta} spot{Math.abs(delta) === 1 ? '' : 's'}
                          </span>
                        )}
                      </td>

                      {/* Volume / Demand */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {item.searchPopularity} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                          ~{estVolume.toLocaleString()} mo. {item.platform === 'ios' ? 'imp.' : 'demand'}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold ${
                            item.difficulty > 70
                              ? 'text-rose-600'
                              : item.difficulty > 40
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {item.difficulty} / 100
                        </span>
                      </td>

                      {/* Competing Apps */}
                      <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-300">
                        {item.competingApps.toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteKeyword(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Remove keyword from rank tracking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add App Modal */}
      {isAddAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsAddAppModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 z-10 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Add App to Rank Tracker
              </h3>
              <button
                onClick={() => setIsAddAppModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddApp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>App Store URL or Package Name / ID</span>
                  {isFetchingMetadata && (
                    <span className="text-[10px] text-blue-600 font-semibold animate-pulse">
                      Auto-fetching store details...
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={targetAppInput}
                  onChange={(e) => handleAppInputChange(e.target.value)}
                  placeholder="Paste link or ID (e.g. com.deanfieldz.yummy)..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Store platform, country, app title, developer, and artwork icon are detected automatically.
                </p>
              </div>

              {/* Advanced Overrides (Optional) */}
              <details className="group text-xs border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/40">
                <summary className="font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none flex items-center justify-between">
                  <span>Advanced Settings (Optional Overrides)</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="mt-3 space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      App Title Override
                    </label>
                    <input
                      type="text"
                      value={customAppName}
                      onChange={(e) => setCustomAppName(e.target.value)}
                      placeholder="e.g. Snap Recipes: Recipe Saver"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Developer
                      </label>
                      <input
                        type="text"
                        value={customDeveloper}
                        onChange={(e) => setCustomDeveloper(e.target.value)}
                        placeholder="e.g. Deanfieldz"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Icon URL
                      </label>
                      <input
                        type="text"
                        value={customIconUrl}
                        onChange={(e) => setCustomIconUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Platform
                      </label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value as Platform)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      >
                        <option value="ios">iOS App Store</option>
                        <option value="android">Google Play Store</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Country
                      </label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value as CountryCode)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.storeCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </details>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAppModalOpen(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isAdding ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <span>Save App</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit App Modal */}
      {isEditAppModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsEditAppModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 z-10 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                Edit App Details
              </h3>
              <button
                onClick={() => setIsEditAppModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedApp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  App Name / Title
                </label>
                <input
                  type="text"
                  value={customAppName}
                  onChange={(e) => setCustomAppName(e.target.value)}
                  placeholder="e.g. Snap Recipes: Recipe Saver"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Developer Name
                </label>
                <input
                  type="text"
                  value={customDeveloper}
                  onChange={(e) => setCustomDeveloper(e.target.value)}
                  placeholder="e.g. Deanfieldz"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  App Icon Image URL
                </label>
                <input
                  type="text"
                  value={customIconUrl}
                  onChange={(e) => setCustomIconUrl(e.target.value)}
                  placeholder="https://play-lh.googleusercontent.com/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ios">iOS App Store</option>
                    <option value="android">Google Play Store</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value as CountryCode)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.storeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditAppModalOpen(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Update App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* App Selector Modal */}
      <AppSelectorModal
        isOpen={isAppSelectorModalOpen}
        onClose={() => setIsAppSelectorModalOpen(false)}
        apps={apps}
        selectedApp={selectedApp}
        onSelectApp={(app) => setSelectedApp(app)}
        onOpenAddApp={() => setIsAddAppModalOpen(true)}
        onRemoveApp={(appId) => handleRemoveApp(appId)}
        onAddLinkedPlatform={(baseApp, targetPlatform) => {
          setPlatform(targetPlatform);
          setCustomAppName(baseApp.name);
          setCustomDeveloper(baseApp.developer);
          setCustomIconUrl(baseApp.iconUrl || '');
          setTargetAppInput('');
          setIsAddAppModalOpen(true);
        }}
      />

      {/* Auto-Detect Organic Keywords Modal */}
      <AutoDetectModal
        isOpen={isAutoDetectModalOpen}
        onClose={() => setIsAutoDetectModalOpen(false)}
        selectedApp={selectedApp}
        existingTrackedKeywords={trackedKeywords.map((k) => k.keyword)}
        onAddKeywords={handleAddDiscoveredKeywords}
      />
    </div>
  );
}
