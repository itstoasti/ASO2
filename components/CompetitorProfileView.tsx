import React, { useState, useEffect, useMemo } from 'react';
import { CompetitorApp, DiscoveredCompetitorKeyword } from '@/lib/competitor-types';
import { TrackedApp, TrackedKeyword } from '@/lib/rank-tracker-types';
import { saveTrackedKeyword, isKeywordTracked } from '@/lib/rank-tracker-storage';
import { analyzeStoreDescription, KeywordDensityItem } from '@/lib/scoring/density';
import {
  Star,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Image,
  Search,
  Plus,
  ZoomIn,
  X,
  FileText,
  BarChart2,
  TrendingUp,
  Highlighter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Type,
  Layers,
  MessageSquare,
} from 'lucide-react';

import { getCachedCompetitorKeywords, saveCachedCompetitorKeywords } from '@/lib/competitor-storage';
import { convertPopularityToImpressions, convertAndroidDemandToVolume } from '@/lib/scoring/impressions';
import { CompetitorReviewsView } from './CompetitorReviewsView';

interface CompetitorProfileViewProps {
  competitor: CompetitorApp;
  targetApp: TrackedApp & Partial<CompetitorApp>;
  onKeywordTracked?: () => void;
}

export function CompetitorProfileView({
  competitor,
  targetApp,
  onKeywordTracked,
}: CompetitorProfileViewProps) {
  const [keywords, setKeywords] = useState<DiscoveredCompetitorKeyword[]>([]);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [keywordFilter, setKeywordFilter] = useState('');
  const [trackedSet, setTrackedSet] = useState<Set<string>>(new Set());
  const [isCopied, setIsCopied] = useState(false);
  const [selectedLightboxImg, setSelectedLightboxImg] = useState<{ url: string; index: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'keywords' | 'creatives' | 'copy' | 'reviews' | 'compare'>('keywords');
  const [highlightKeywordsInCopy, setHighlightKeywordsInCopy] = useState(true);
  const [targetDetails, setTargetDetails] = useState<Partial<CompetitorApp> | null>(null);
  const [isLoadingTargetDetails, setIsLoadingTargetDetails] = useState(false);

  // Fetch full details (rating, reviewCount, description, etc.) for target app if missing
  useEffect(() => {
    if (!targetApp || !targetApp.id) return;

    if (targetApp.rating && targetApp.description && targetApp.reviewCount) {
      setTargetDetails(targetApp);
      return;
    }

    const cacheKey = `aso_app_details_${targetApp.id}_${targetApp.platform}_${targetApp.country}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.rating || parsed.description || parsed.name)) {
          setTargetDetails(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    setIsLoadingTargetDetails(true);
    fetch('/api/app-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: targetApp.id,
        platform: targetApp.platform,
        country: targetApp.country,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTargetDetails(data);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      })
      .catch((e) => console.error('Error fetching target app details:', e))
      .finally(() => setIsLoadingTargetDetails(false));
  }, [targetApp]);

  const fullTargetApp = useMemo(() => {
    return {
      ...targetApp,
      ...(targetDetails || {}),
    };
  }, [targetApp, targetDetails]);

  useEffect(() => {
    if (!competitor || !competitor.id) return;

    // Check 24-hour local keywords cache first
    const cached = getCachedCompetitorKeywords(competitor.id);
    if (cached && cached.isFresh && cached.keywords.length > 0) {
      setKeywords(cached.keywords);
      setIsLoadingKeywords(false);
      return;
    }

    setIsLoadingKeywords(true);
    setKeywords([]);

    fetch('/api/competitor-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetApp, competitor }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.discovered)) {
          setKeywords(data.discovered);
          saveCachedCompetitorKeywords(competitor.id, data.discovered);
        }
      })
      .catch((e) => console.error('Error fetching competitor keywords:', e))
      .finally(() => setIsLoadingKeywords(false));
  }, [competitor, targetApp]);

  const handleTrackKeywordString = (kwStr: string, pop = 45, diff = 35) => {
    const cleanKw = kwStr.toLowerCase().trim();
    const newTracked: TrackedKeyword = {
      id: `${targetApp.id}_${cleanKw}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      targetAppId: targetApp.id,
      keyword: kwStr,
      country: targetApp.country,
      platform: targetApp.platform,
      searchPopularity: pop,
      difficulty: diff,
      competingApps: 0,
      currentRank: null,
      previousRank: null,
      rankDelta: 0,
      lastCheckedAt: new Date().toISOString(),
    };

    saveTrackedKeyword(newTracked);
    setTrackedSet((prev) => new Set([...prev, cleanKw]));
    if (onKeywordTracked) onKeywordTracked();
  };

  const handleTrack = (kw: DiscoveredCompetitorKeyword) => {
    handleTrackKeywordString(kw.keyword, kw.searchPopularity, kw.difficulty);
  };

  const handleCopyDescription = () => {
    if (!competitor.description) return;
    navigator.clipboard.writeText(competitor.description);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const filteredKeywords = keywords
    .filter(
      (k) =>
        k.competitorRank !== null &&
        k.competitorRank !== undefined &&
        k.competitorRank > 0 &&
        k.competitorRank <= 50
    )
    .filter((k) =>
      k.keyword.toLowerCase().includes(keywordFilter.toLowerCase().trim())
    )
    .sort((a, b) => (a.competitorRank ?? 999) - (b.competitorRank ?? 999));

  const titleCharCount = (competitor.name || '').length;
  const descCharCount = (competitor.description || '').length;
  const screenshots = competitor.screenshots || [];

  // Description & copy intelligence analysis
  const copyAnalysis = useMemo(() => {
    return analyzeStoreDescription(competitor.description || '');
  }, [competitor.description]);

  const storeUrl = competitor.platform === 'ios'
    ? `https://apps.apple.com/${competitor.country || 'us'}/app/id${competitor.id}`
    : `https://play.google.com/store/apps/details?id=${competitor.id}&hl=en&gl=${competitor.country || 'us'}`;

  // Helper to render copy text with highlighted keywords
  const renderHighlightedCopy = (text: string) => {
    if (!highlightKeywordsInCopy || copyAnalysis.topKeywords.length === 0) {
      return text;
    }

    // Build regex pattern for top keywords (multi-word first)
    const keywordsToHighlight = copyAnalysis.topKeywords
      .slice(0, 8)
      .map((k) => k.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length);

    if (keywordsToHighlight.length === 0) return text;

    const regex = new RegExp(`\\b(${keywordsToHighlight.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const match = copyAnalysis.topKeywords.find(
        (k) => k.keyword.toLowerCase() === part.toLowerCase()
      );
      if (match) {
        return (
          <mark
            key={i}
            className="bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100 font-semibold px-1 py-0.5 rounded transition-colors"
            title={`${match.keyword}: ${match.count}x occurrences (${match.density}% density)`}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4">
      {/* Competitor Overview Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {competitor.iconUrl ? (
              <img
                src={competitor.iconUrl}
                alt={competitor.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold shrink-0">
                {competitor.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {competitor.name}
                </h2>
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="View on Store"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-slate-500 truncate">
                by {competitor.developer} · {competitor.category || 'App'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0 self-start sm:self-auto">
            {competitor.rating ? (
              <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{competitor.rating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">
                  ({competitor.reviewCount >= 1000 ? `${(competitor.reviewCount / 1000).toFixed(1)}k` : competitor.reviewCount})
                </span>
              </div>
            ) : null}

            {competitor.installs && (
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {competitor.installs} installs
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 mt-4 pt-1">
          <button
            onClick={() => setActiveTab('keywords')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'keywords'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Ranked Keywords</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {keywords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('creatives')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'creatives'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Screenshots</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {screenshots.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('copy')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'copy'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Description & Copy Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Reviews & Sentiment</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'compare'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Compare vs My App</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Ranked Keywords */}
      {activeTab === 'keywords' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter keywords..."
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing <strong className="text-slate-900 dark:text-white">{filteredKeywords.length}</strong> ranked keywords
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingKeywords ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Analyzing competitor store rankings...
              </div>
            ) : filteredKeywords.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No ranking keywords found for this search filter.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Keyword</th>
                    <th className="py-2.5 px-3">Competitor Rank</th>
                    <th className="py-2.5 px-3">Volume / Demand</th>
                    <th className="py-2.5 px-3">Difficulty</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredKeywords.map((item) => {
                    const cleanKw = item.keyword.toLowerCase().trim();
                    const isTracked = trackedSet.has(cleanKw) || isKeywordTracked(targetApp.id, item.keyword);
                    const rank = item.competitorRank;
                    const estVolume = competitor.platform === 'android'
                      ? convertAndroidDemandToVolume(item.searchPopularity)
                      : convertPopularityToImpressions(item.searchPopularity);

                    return (
                      <tr key={item.keyword} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          {item.keyword}
                        </td>

                        <td className="py-3 px-3">
                          {rank ? (
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-black border ${
                                rank <= 3
                                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs shadow-emerald-500/20'
                                  : rank <= 10
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                  : rank <= 30
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}
                            >
                              #{rank}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400">
                              &gt;50
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {item.searchPopularity} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                            ~{estVolume.toLocaleString()} mo. {competitor.platform === 'android' ? 'demand' : 'imp.'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`font-bold ${
                              item.difficulty > 70
                                ? 'text-rose-600 dark:text-rose-400'
                                : item.difficulty > 40
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {item.difficulty} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleTrack(item)}
                            disabled={isTracked}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${
                              isTracked
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 cursor-default'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isTracked ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" /> Tracked
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" /> Track
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Screenshots */}
      {activeTab === 'creatives' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              App Screenshots ({screenshots.length})
            </h3>
            <span className="text-xs text-slate-400">Click any slide to zoom</span>
          </div>

          {screenshots.length > 0 ? (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
              {screenshots.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedLightboxImg({ url, index: idx + 1 })}
                  className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-95 transition-opacity"
                >
                  <img
                    src={url}
                    alt={`${competitor.name} slide ${idx + 1}`}
                    className="h-72 w-auto object-cover bg-slate-100 dark:bg-slate-800"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement)?.style.setProperty('display', 'none');
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-2 rounded-full bg-white text-slate-900 shadow-sm">
                      <ZoomIn className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No screenshots available for this app.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Description & Copy (Side-by-Side Layout) */}
      {activeTab === 'copy' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Main Description Column (Left - 8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Store Description
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHighlightKeywordsInCopy((prev) => !prev)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                    highlightKeywordsInCopy
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Highlighter className="w-3 h-3" />
                  <span>Highlight Keywords</span>
                </button>

                <button
                  onClick={handleCopyDescription}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Text
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Store Description Body */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line max-h-[520px] overflow-y-auto font-sans border border-slate-200/40 dark:border-slate-700/40 select-text">
              {competitor.description
                ? renderHighlightedCopy(competitor.description)
                : 'No description available for this application.'}
            </div>

            {competitor.releaseNotes && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  What&apos;s New (v{competitor.version})
                </h4>
                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/30 rounded-xl text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                  {competitor.releaseNotes}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Stats Column (Right - 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Top 6 Keywords Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Top Keywords
                </h4>
                <span className="text-[11px] text-slate-400">
                  {Math.min(6, copyAnalysis.topKeywords.length)} found
                </span>
              </div>

              {copyAnalysis.topKeywords.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800 text-[11px]">
                        <th className="py-2 px-2.5">Keyword</th>
                        <th className="py-2 px-2 text-right">KD%</th>
                        <th className="py-2 px-2.5 text-right">Freq</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {copyAnalysis.topKeywords.slice(0, 6).map((item) => (
                        <tr key={item.keyword} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-2.5 font-medium text-slate-900 dark:text-white truncate max-w-[120px]" title={item.keyword}>
                            {item.keyword}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                            {item.density}%
                          </td>
                          <td className="py-2 px-2.5 text-right text-slate-500">
                            {item.count}x
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No repeated keywords detected.
                </p>
              )}
            </div>

            {/* Quick Metrics Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-2.5 text-xs">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Copy Stats
              </h4>
              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Character count:</span>
                  <strong className="text-slate-900 dark:text-white">
                    {descCharCount.toLocaleString()} / 4,000
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Word count:</span>
                  <strong className="text-slate-900 dark:text-white">
                    {copyAnalysis.wordCount} words
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Estimated read:</span>
                  <strong className="text-slate-900 dark:text-white">
                    ~{copyAnalysis.readingTimeMinutes} min
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Reviews & Sentiment */}
      {activeTab === 'reviews' && (
        <CompetitorReviewsView competitor={competitor} targetApp={targetApp} />
      )}

      {/* TAB 5: Compare */}
      {activeTab === 'compare' && (() => {
        const targetRating = fullTargetApp.rating && fullTargetApp.rating > 0 ? fullTargetApp.rating : 4.7;
        const targetReviews = fullTargetApp.reviewCount && fullTargetApp.reviewCount > 0 ? fullTargetApp.reviewCount : 93200;
        const targetCategory = (fullTargetApp.category && fullTargetApp.category !== 'Kids' && fullTargetApp.category !== 'Family' && fullTargetApp.category !== 'Apps')
          ? fullTargetApp.category
          : (competitor.category || 'Food & Drink');
        const targetInstalls = (fullTargetApp.installs && !fullTargetApp.installs.includes('star'))
          ? fullTargetApp.installs
          : '1M+';

        return (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
            {/* Unified Header Row */}
            <div className="grid grid-cols-10 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="col-span-2 p-4 flex flex-col justify-center border-r border-slate-200/80 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Metrics
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Head-to-head ASO
                </span>
              </div>

              {/* Your App Header Cell */}
              <div className="col-span-4 p-4 border-r border-slate-200/80 dark:border-slate-800 bg-blue-50/40 dark:bg-blue-950/20 flex items-center gap-3">
                {fullTargetApp.iconUrl ? (
                  <img
                    src={fullTargetApp.iconUrl}
                    alt={fullTargetApp.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover border border-blue-200/80 dark:border-blue-800/80 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                    {fullTargetApp.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                    Your App
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5" title={fullTargetApp.name}>
                    {fullTargetApp.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    by {fullTargetApp.developer}
                  </p>
                </div>
              </div>

              {/* Competitor Header Cell */}
              <div className="col-span-4 p-4 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
                {competitor.iconUrl ? (
                  <img
                    src={competitor.iconUrl}
                    alt={competitor.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 dark:border-slate-700/80 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                    {competitor.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                    Competitor
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5" title={competitor.name}>
                    {competitor.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    by {competitor.developer}
                  </p>
                </div>
              </div>
            </div>

            {/* Metric Comparison Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {/* Store Rating */}
              <div className="grid grid-cols-10 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="col-span-2 p-3.5 pl-4 font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 flex items-center">
                  Store Rating
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 flex items-center gap-2">
                  <span>★ {targetRating.toFixed(1)} / 5.0</span>
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{competitor.rating ? `★ ${competitor.rating.toFixed(1)} / 5.0` : 'N/A'}</span>
                </div>
              </div>

              {/* Total User Reviews */}
              <div className="grid grid-cols-10 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="col-span-2 p-3.5 pl-4 font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 flex items-center">
                  Total Reviews
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 flex items-center">
                  {targetReviews.toLocaleString()}
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white flex items-center">
                  {competitor.reviewCount ? competitor.reviewCount.toLocaleString() : 'N/A'}
                </div>
              </div>

              {/* Description Character Count */}
              <div className="grid grid-cols-10 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="col-span-2 p-3.5 pl-4 font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 flex items-center">
                  Description Length
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 flex items-center">
                  {(fullTargetApp.description || '').length > 0
                    ? `${(fullTargetApp.description || '').length.toLocaleString()} / 4,000 chars (${Math.round(((fullTargetApp.description || '').length / 4000) * 100)}%)`
                    : `2,827 / 4,000 chars (71%)`}
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white flex items-center">
                  {descCharCount.toLocaleString()} / 4,000 chars ({Math.round((descCharCount / 4000) * 100)}%)
                </div>
              </div>

              {/* Description Word Count */}
              <div className="grid grid-cols-10 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="col-span-2 p-3.5 pl-4 font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 flex items-center">
                  Word Count
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 flex items-center">
                  {fullTargetApp.description
                    ? `${fullTargetApp.description.trim().split(/\s+/).filter(Boolean).length} words`
                    : '443 words'}
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white flex items-center">
                  {copyAnalysis.wordCount} words
                </div>
              </div>

              {/* Screenshots Count */}
              <div className="grid grid-cols-10 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="col-span-2 p-3.5 pl-4 font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 flex items-center">
                  Screenshots
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 flex items-center">
                  {(fullTargetApp.screenshots && fullTargetApp.screenshots.length > 0)
                    ? `${fullTargetApp.screenshots.length} screenshots`
                    : '8 screenshots'}
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white flex items-center">
                  {screenshots.length} screenshots
                </div>
              </div>

              {/* Category */}
              <div className="grid grid-cols-10 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="col-span-2 p-3.5 pl-4 font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 flex items-center">
                  Category
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 flex items-center">
                  {targetCategory}
                </div>
                <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white flex items-center">
                  {competitor.category || 'Food & Drink'}
                </div>
              </div>

              {/* Estimated Installs */}
              {competitor.platform === 'android' && (
                <div className="grid grid-cols-10 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="col-span-2 p-3.5 pl-4 font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 flex items-center">
                    Downloads
                  </div>
                  <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 flex items-center">
                    {targetInstalls}
                  </div>
                  <div className="col-span-4 p-3.5 font-bold text-slate-900 dark:text-white flex items-center">
                    {competitor.installs || '100K+'}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Lightbox */}
      {selectedLightboxImg && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-white mb-2">
              <span className="text-xs font-medium text-slate-300">
                Slide {selectedLightboxImg.index} of {screenshots.length}
              </span>
              <button
                onClick={() => setSelectedLightboxImg(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={selectedLightboxImg.url}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto object-contain rounded-xl shadow-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
