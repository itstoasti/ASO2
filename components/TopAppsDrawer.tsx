import React from 'react';
import { KeywordResult } from '@/lib/types';
import { X, Star, Apple, Play, Trophy, Target, TrendingUp, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from './Badge';

interface TopAppsDrawerProps {
  keywordResult: KeywordResult | null;
  onClose: () => void;
}

export function TopAppsDrawer({ keywordResult, onClose }: TopAppsDrawerProps) {
  if (!keywordResult) return null;

  const { keyword, platform, topApps, placementBreakdown, opportunityScore, difficulty, searchPopularity } = keywordResult;

  const titlePct = placementBreakdown?.titlePercentage ?? 30;
  const subPct = placementBreakdown?.subtitlePercentage ?? 40;
  const descPct = placementBreakdown?.descriptionPercentage ?? 30;
  const titleOpp = placementBreakdown?.titleOpportunity ?? 'High';
  const monthlyVelocity = placementBreakdown?.avg30dReviewVelocity ?? 1250;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 flex flex-col justify-end sm:justify-stretch">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Container: Bottom Sheet on Mobile, Right Drawer on Desktop */}
      <div className="relative w-full sm:w-auto sm:absolute sm:inset-y-0 sm:right-0 max-w-full flex sm:pl-10 pointer-events-none">
        <div className="w-full sm:w-screen sm:max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-t-none flex flex-col max-h-[90vh] sm:max-h-full pointer-events-auto pb-safe sm:pb-0 animate-sheet-up sm:animate-none">
          
          {/* Mobile Swipe / Pull Handle Bar Indicator */}
          <div className="sm:hidden w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto my-2.5 shrink-0" />

          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant={platform === 'ios' ? 'ios' : 'android'}>
                    {platform === 'ios' ? (
                      <>
                        <Apple className="w-3 h-3" /> iOS App Store
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-emerald-600" /> Google Play
                      </>
                    )}
                  </Badge>
                  <span className="text-xs text-slate-400 font-medium">Deep ASO Intelligence</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  &quot;{keyword}&quot;
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Opportunity</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {opportunityScore} / 100
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Difficulty</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {difficulty} / 100
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Search Demand</span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                  {searchPopularity} / 100
                </span>
              </div>
            </div>
          </div>

          {/* Drawer Body Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Section 1: Exact Keyword Placement Breakdown (Title vs Subtitle vs Description) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Keyword Placement Breakdown (Top 10 Apps)
                  </h3>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    titleOpp === 'High'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  }`}
                >
                  {titleOpp} Title Opportunity
                </span>
              </div>

              {/* Progress Stack Bar */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${titlePct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                    title={`Title Match: ${titlePct}%`}
                  />
                  <div
                    style={{ width: `${subPct}%` }}
                    className="bg-blue-500 h-full transition-all duration-500"
                    title={`Subtitle Match: ${subPct}%`}
                  />
                  <div
                    style={{ width: `${descPct}%` }}
                    className="bg-slate-400 dark:bg-slate-600 h-full transition-all duration-500"
                    title={`Description/Unmatched: ${descPct}%`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Title: <strong>{titlePct}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    <span>Subtitle: <strong>{subPct}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 inline-block" />
                    <span>Description: <strong>{descPct}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Strategic ASO Recommendation Box */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                    ASO Strategic Insight
                  </span>
                  {titlePct <= 40 ? (
                    <span>
                      Only <strong>{titlePct}%</strong> of top 10 competitors include exact keyword in their App Title. Adding <strong>&quot;{keyword}&quot;</strong> directly into your 30-character App Title gives you a massive ASO weight advantage to outrank existing apps!
                    </span>
                  ) : (
                    <span>
                      High title saturation (<strong>{titlePct}%</strong> of top apps target this exact keyword in Title). Consider using exact subtitle match or combining with a long-tail modifier.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: 30-Day Competitor Review Momentum */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Top 5 Competitor Review Momentum
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    ~{monthlyVelocity.toLocaleString()} new reviews / 30 days
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-500 block">
                  {monthlyVelocity < 1000 ? 'Low Review Velocity' : monthlyVelocity < 5000 ? 'Moderate Velocity' : 'High Velocity'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {monthlyVelocity < 2000 ? 'Easy to overtake' : 'Established momentum'}
                </span>
              </div>
            </div>

            {/* Section 3: Top 10 Ranking Apps List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Top 10 Ranking App Competitors
                </h3>
                <span className="text-xs text-slate-400">Store Search Index</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                {topApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Position */}
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                        #{app.position}
                      </span>

                      {/* App Icon */}
                      {app.iconUrl ? (
                        <img
                          src={app.iconUrl}
                          alt={app.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200/60 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                          {app.name.charAt(0)}
                        </div>
                      )}

                      {/* Title & Developer */}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {app.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 truncate block">
                          {app.developer}
                        </span>
                      </div>
                    </div>

                    {/* Right Info: Match Tag, Rating & Review Velocity */}
                    <div className="text-right shrink-0 pl-3">
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            app.matchedIn === 'title'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : app.matchedIn === 'subtitle'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {app.matchedIn === 'title' ? 'Title Match' : app.matchedIn === 'subtitle' ? 'Subtitle Match' : 'Description'}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                        <div className="flex items-center text-amber-500">
                          <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                          <span>{app.rating}</span>
                        </div>
                        <span className="text-slate-300">·</span>
                        <span>{app.reviewCount.toLocaleString()} rev.</span>
                      </div>

                      {app.reviewVelocity30d && (
                        <span className="text-[10px] text-slate-400 block font-normal">
                          +{(app.reviewVelocity30d).toLocaleString()}/mo. velocity
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Real-time competitor rank intelligence</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded-xl font-bold transition-all text-xs"
            >
              Close Intelligence Drawer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
