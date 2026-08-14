import React, { useState } from 'react';
import { CompetitorApp } from '@/lib/competitor-types';
import { TrackedApp } from '@/lib/rank-tracker-types';
import { Star, Apple, Play, ExternalLink, Trash2, ChevronDown, ChevronUp, Copy, Check, Sparkles, Image, Calendar, Layers, Shield } from 'lucide-react';
import { Badge } from './Badge';

interface CompetitorVitalsCardProps {
  targetApp: TrackedApp & Partial<CompetitorApp>;
  competitors: CompetitorApp[];
  onRemoveCompetitor: (competitorId: string) => void;
  onOpenSpyModal: (competitor: CompetitorApp) => void;
  onViewScreenshots: (app: CompetitorApp | (TrackedApp & Partial<CompetitorApp>)) => void;
}

export function CompetitorVitalsCard({
  targetApp,
  competitors,
  onRemoveCompetitor,
  onOpenSpyModal,
  onViewScreenshots,
}: CompetitorVitalsCardProps) {
  const [expandedDescAppId, setExpandedDescAppId] = useState<string | null>(null);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);

  const handleCopyDescription = (appId: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAppId(appId);
    setTimeout(() => setCopiedAppId(null), 2000);
  };

  const allApps = [
    { ...targetApp, isTarget: true } as CompetitorApp & { isTarget: boolean },
    ...competitors.map((c) => ({ ...c, isTarget: false })),
  ];

  return (
    <div className="space-y-6">
      {/* Vitals Grid Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allApps.map((app) => {
          const isTarget = app.isTarget;
          const isExpanded = expandedDescAppId === app.id;
          const charCount = (app.description || '').length;
          const titleCharCount = (app.name || '').length;

          const storeUrl = app.platform === 'ios'
            ? `https://apps.apple.com/${app.country || 'us'}/app/id${app.id}`
            : `https://play.google.com/store/apps/details?id=${app.id}&hl=en&gl=${app.country || 'us'}`;

          return (
            <div
              key={app.id}
              className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs ${
                isTarget
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Header */}
              <div className="p-5 space-y-4 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {app.iconUrl ? (
                      <img
                        src={app.iconUrl}
                        alt={app.name}
                        className="w-12 h-12 rounded-xl object-cover shadow-xs border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                        {app.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        {isTarget ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                            Your App
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                            Competitor
                          </span>
                        )}
                        <Badge variant={app.platform === 'ios' ? 'ios' : 'android'}>
                          {app.platform === 'ios' ? <Apple className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 text-emerald-500" />}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={app.name}>
                        {app.name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">{app.developer}</p>
                    </div>
                  </div>

                  {!isTarget && (
                    <button
                      onClick={() => onRemoveCompetitor(app.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Remove competitor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Rating</span>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {app.rating ? app.rating.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Reviews</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5">
                      {app.reviewCount ? (app.reviewCount >= 1000000 ? `${(app.reviewCount / 1000000).toFixed(1)}M` : app.reviewCount >= 1000 ? `${(app.reviewCount / 1000).toFixed(0)}k` : app.reviewCount) : app.installs || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mt-0.5 truncate px-1" title={app.category}>
                      {app.category || 'Apps'}
                    </span>
                  </div>
                </div>

                {/* App Vitals & Metadata Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" /> Version:
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {app.version || 'Latest'}
                    </span>
                  </div>

                  {app.updatedAt && (
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Updated:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(app.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Title Character Length:</span>
                    <span className={`font-bold ${titleCharCount > 30 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {titleCharCount} / 30 chars
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Description Length:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {charCount.toLocaleString()} / 4,000 chars
                    </span>
                  </div>
                </div>

                {/* Description Preview / Collapsible */}
                {app.description && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Store Description
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyDescription(app.id, app.description || '')}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                        >
                          {copiedAppId === app.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setExpandedDescAppId(isExpanded ? null : app.id)}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5"
                        >
                          {isExpanded ? (
                            <>
                              Less <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              More <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans ${
                      isExpanded ? 'whitespace-pre-line max-h-60 overflow-y-auto' : 'line-clamp-3'
                    }`}>
                      {app.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onViewScreenshots(app)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Image className="w-3.5 h-3.5 text-blue-500" />
                  <span>Screenshots ({app.screenshots?.length || 0})</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {!isTarget && (
                    <button
                      onClick={() => onOpenSpyModal(app)}
                      className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      title="Discover keywords this competitor targets"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Spy Keywords</span>
                    </button>
                  )}

                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="View on Store"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
