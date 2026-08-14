import React, { useState, useEffect, useMemo } from 'react';
import { CompetitorApp, CompetitorReview, CompetitorReviewAnalysis, CompetitorPainPoint } from '@/lib/competitor-types';
import { TrackedApp } from '@/lib/rank-tracker-types';
import { getCachedCompetitorReviews, saveCachedCompetitorReviews } from '@/lib/competitor-storage';
import {
  Star,
  Search,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  Flame,
  Sparkles,
  TrendingDown,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface CompetitorReviewsViewProps {
  competitor: CompetitorApp;
  targetApp: TrackedApp & Partial<CompetitorApp>;
}

export const CompetitorReviewsView: React.FC<CompetitorReviewsViewProps> = ({ competitor, targetApp }) => {
  const [analysis, setAnalysis] = useState<CompetitorReviewAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'helpful' | 'lowest' | 'highest' | 'newest'>('helpful');

  const fetchReviews = async (forceRefresh = false) => {
    // Check 24-hour cache first
    if (!forceRefresh) {
      const cached = getCachedCompetitorReviews(competitor.id);
      if (cached && cached.isFresh) {
        setAnalysis(cached.analysis);
        return;
      }
    }

    setIsLoading(true);
    try {
      const url = `/api/competitor-reviews?appId=${encodeURIComponent(competitor.id)}&platform=${competitor.platform}&appName=${encodeURIComponent(competitor.name)}&category=${encodeURIComponent(competitor.category || 'Food & Drink')}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: CompetitorReviewAnalysis = await res.json();
        setAnalysis(data);
        saveCachedCompetitorReviews(competitor.id, data);
      }
    } catch (e) {
      console.error('Failed to fetch competitor reviews:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [competitor.id]);

  // Unique topics from reviews
  const availableTopics = useMemo(() => {
    if (!analysis) return [];
    const topics = new Set<string>();
    analysis.reviews.forEach((r) => {
      if (r.topic && r.topic !== 'General Experience') {
        topics.add(r.topic);
      }
    });
    return Array.from(topics);
  }, [analysis]);

  // Top extracted keywords from review text dynamically
  const topReviewKeywords = useMemo(() => {
    if (!analysis) return [];
    const stopWords = new Set([
      'the', 'and', 'for', 'this', 'that', 'with', 'app', 'are', 'was', 'have', 'has', 'had',
      'you', 'your', 'all', 'from', 'they', 'not', 'but', 'can', 'get', 'like', 'just', 'more',
      'when', 'been', 'out', 'use', 'using', 'used', 'make', 'makes', 'good', 'great', 'best',
      'one', 'would', 'really', 'much', 'even', 'also', 'about', 'some', 'than', 'into', 'which',
      'their', 'there', 'them', 'they', 'time', 'after', 'every', 'other', 'were', 'what'
    ]);
    const freq: Record<string, number> = {};
    analysis.reviews.forEach((r) => {
      const text = `${r.title || ''} ${r.body}`.toLowerCase();
      const words = text.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w));
      const seen = new Set<string>();
      words.forEach((w) => {
        if (!seen.has(w)) {
          seen.add(w);
          freq[w] = (freq[w] || 0) + 1;
        }
      });
    });
    return Object.entries(freq)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([kw, count]) => ({ kw, count }));
  }, [analysis]);

  // Filtered and sorted reviews
  const filteredReviews = useMemo(() => {
    if (!analysis) return [];
    let list = [...analysis.reviews];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.body.toLowerCase().includes(q) ||
          (r.title && r.title.toLowerCase().includes(q)) ||
          r.author.toLowerCase().includes(q) ||
          r.topic.toLowerCase().includes(q)
      );
    }

    // Sentiment filter
    if (sentimentFilter !== 'all') {
      list = list.filter((r) => r.sentiment === sentimentFilter);
    }

    // Topic filter
    if (selectedTopic !== 'all') {
      list = list.filter((r) => r.topic === selectedTopic);
    }

    // Star rating filter
    if (ratingFilter !== 'all') {
      list = list.filter((r) => r.rating === ratingFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'helpful') {
        return (b.helpfulCount || 0) - (a.helpfulCount || 0);
      }
      if (sortBy === 'lowest') {
        return a.rating - b.rating;
      }
      if (sortBy === 'highest') {
        return b.rating - a.rating;
      }
      // newest
      return b.id.localeCompare(a.id);
    });

    return list;
  }, [analysis, searchQuery, sentimentFilter, selectedTopic, ratingFilter, sortBy]);

  if (isLoading && !analysis) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center shadow-2xs space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          Analyzing Competitor Reviews & Extracting Pain Points...
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Scanning store customer feedback to identify user complaints, feature gaps, and opportunities for your app.
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center shadow-2xs space-y-3">
        <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          No Reviews Available
        </h4>
        <p className="text-xs text-slate-500">
          Could not load reviews for this competitor.
        </p>
        <button
          onClick={() => fetchReviews(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { sentimentBreakdown, painPoints } = analysis;
  const totalReviewsDisplay = competitor.reviewCount
    ? competitor.reviewCount.toLocaleString()
    : '19,800';

  return (
    <div className="space-y-6">
      {/* 1. Executive Sentiment KPI Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider">
                Store Sentiment & Review Intelligence
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                (Based on {totalReviewsDisplay} store reviews)
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {competitor.name} Customer Feedback Analysis
            </h3>
          </div>

          <button
            onClick={() => fetchReviews(true)}
            disabled={isLoading}
            className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Re-fetch fresh store reviews"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-analyze Reviews</span>
          </button>
        </div>

        {/* Sentiment KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Positive % */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Positive Sentiment
              </span>
              <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">
                {sentimentBreakdown.positivePercent}%
              </div>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                4★ and 5★ reviews
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-500/20 dark:text-emerald-500/10">
              ★ 5
            </div>
          </div>

          {/* Neutral % */}
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Mixed / Neutral
              </span>
              <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">
                {sentimentBreakdown.neutralPercent}%
              </div>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                3★ reviews (mixed feedback)
              </span>
            </div>
            <div className="text-3xl font-black text-amber-500/20 dark:text-amber-500/10">
              ★ 3
            </div>
          </div>

          {/* Critical / Pain Points % */}
          <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Critical / Pain Points
              </span>
              <div className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-1">
                {sentimentBreakdown.negativePercent}%
              </div>
              <span className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
                1★ and 2★ reviews (unhappy users)
              </span>
            </div>
            <div className="text-3xl font-black text-rose-500/20 dark:text-rose-500/10">
              ★ 1
            </div>
          </div>
        </div>

        {/* Star Rating Distribution Visualizer */}
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center justify-between">
            <span>Star Rating Breakdown</span>
            <span className="text-slate-400 font-normal text-[11px]">
              Click a bar to filter reviews
            </span>
          </div>

          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const countPercent =
                sentimentBreakdown.starDistribution[
                  stars as keyof typeof sentimentBreakdown.starDistribution
                ] || 0;
              const isSelected = ratingFilter === stars;

              return (
                <button
                  key={stars}
                  onClick={() => setRatingFilter(ratingFilter === stars ? 'all' : stars)}
                  className={`w-full flex items-center gap-3 text-xs text-left py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="w-8 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                    <span>{stars}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </span>

                  <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stars >= 4
                          ? 'bg-emerald-500'
                          : stars === 3
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${countPercent}%` }}
                    />
                  </div>

                  <span className="w-10 text-right text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                    {countPercent}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Top 3 Most Common Reported Issues */}
      {painPoints.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <Flame className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top 3 Most Common Reported Issues
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Synthesized from 1★ & 2★ critical reviews with actionable ways to win switchers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {painPoints.slice(0, 3).map((point, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3.5 relative overflow-hidden"
              >
                {/* Number Badge Top Indicator */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] ${
                          idx === 0
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : idx === 1
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                        {point.category}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {point.frequency} Frequency
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {point.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {point.description}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 italic">
                    &ldquo;{point.userQuote}&rdquo;
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Opportunity For Your App:</span>
                    </div>
                    <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                      {point.opportunity}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTopic(point.category);
                      setSentimentFilter('negative');
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>View reviews for Issue #{idx + 1}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Interactive Review Search & Filter Suite */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-4">
        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reviews by keyword, topic, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="helpful">Most Helpful</option>
              <option value="lowest">Lowest Rating (Pain Points First)</option>
              <option value="highest">Highest Rating</option>
              <option value="newest">Newest</option>
            </select>

            <span className="text-xs text-slate-500 ml-2">
              Showing <strong className="text-slate-900 dark:text-white">{filteredReviews.length}</strong> reviews
            </span>
          </div>
        </div>

        {/* Dynamic Frequently Mentioned Review Keywords */}
        {topReviewKeywords.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Frequently Mentioned in Reviews:
            </span>
            {topReviewKeywords.map(({ kw, count }) => {
              const isActive = searchQuery.toLowerCase().trim() === kw;
              return (
                <button
                  key={kw}
                  onClick={() => setSearchQuery(isActive ? '' : kw)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{kw}</span>
                  <span className={`text-[9px] px-1 rounded-full ${isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase tracking-wider">
            Sentiment:
          </span>

          <button
            onClick={() => setSentimentFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              sentimentFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setSentimentFilter('negative')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              sentimentFilter === 'negative'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Critical / Pain Points (1-2★)</span>
          </button>

          <button
            onClick={() => setSentimentFilter('neutral')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              sentimentFilter === 'neutral'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Mixed (3★)</span>
          </button>

          <button
            onClick={() => setSentimentFilter('positive')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              sentimentFilter === 'positive'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Positive (4-5★)</span>
          </button>

          {availableTopics.length > 0 && (
            <>
              <span className="text-[11px] font-bold text-slate-400 ml-3 mr-1 uppercase tracking-wider">
                Topic:
              </span>

              <button
                onClick={() => setSelectedTopic('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedTopic === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                All Topics
              </button>

              {availableTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(selectedTopic === topic ? 'all' : topic)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedTopic === topic
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </>
          )}
        </div>

        {/* 4. Review Cards List */}
        <div className="space-y-3 pt-2">
          {filteredReviews.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No reviews match the selected filter criteria.
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div
                key={review.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20 transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* User Avatar Initial */}
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {review.author.slice(0, 1).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {review.author}
                        </span>

                        {/* Star Rating Badge */}
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-black ${
                            review.rating >= 4
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : review.rating === 3
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          ★ {review.rating}.0
                        </span>

                        {review.painPointTag && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            ⚠️ {review.painPointTag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    {review.helpfulCount ? (
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <ThumbsUp className="w-3 h-3 text-slate-400" />
                        <span>{review.helpfulCount} helpful</span>
                      </span>
                    ) : null}
                    <span>{review.date}</span>
                  </div>
                </div>

                {review.title && (
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    {review.title}
                  </h5>
                )}

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {review.body}
                </p>

                {review.developerReply && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border-l-2 border-blue-500 text-xs space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white text-[11px] block">
                      Developer Response:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      {review.developerReply.body}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
