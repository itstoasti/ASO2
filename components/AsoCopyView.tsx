import React, { useState } from 'react';
import { KeywordResult } from '@/lib/types';
import { Copy, Check, Sparkles, FileText, Smartphone } from 'lucide-react';

interface AsoCopyViewProps {
  results: KeywordResult[];
  seedKeyword: string;
}

export function AsoCopyView({ results, seedKeyword }: AsoCopyViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!results || results.length === 0) {
    return null;
  }

  // Filter high opportunity keywords (sorted by opportunity score)
  const topKeywords = [...results]
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .map((r) => r.keyword);

  // 1. Generate 30-character Title suggestions
  const titleSuggestions = topKeywords
    .filter((k) => k.length <= 30)
    .slice(0, 5);

  // 2. Generate 30-character Subtitle suggestions
  const subtitleSuggestions = topKeywords
    .filter((k) => k.length > 5 && k.length <= 30)
    .slice(2, 8);

  // 3. Generate 100-character iOS Keyword Field (deduplicated words, comma separated)
  const allWords = new Set<string>();
  topKeywords.forEach((phrase) => {
    phrase.toLowerCase().split(/\s+/).forEach((w) => {
      if (w.length >= 2 && !allWords.has(w)) {
        allWords.add(w);
      }
    });
  });

  const iosKeywordWords: string[] = [];
  let currentLength = 0;
  for (const word of Array.from(allWords)) {
    const nextLen = currentLength + (currentLength > 0 ? 1 : 0) + word.length;
    if (nextLen <= 100) {
      iosKeywordWords.push(word);
      currentLength = nextLen;
    } else {
      break;
    }
  }

  const iosKeywordField = iosKeywordWords.join(',');

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mb-12 space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ASO Metadata Copy Builder
              </h2>
              <p className="text-xs text-slate-400">
                Copy-paste optimized metadata fields generated directly from your filtered keyword dataset.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: iOS 100-Character Keyword Field */}
        <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                iOS 100-Character Keyword Field
              </span>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {iosKeywordField.length} / 100 Chars
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={iosKeywordField}
              className="flex-1 p-2.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
            />
            <button
              onClick={() => copyToClipboard(iosKeywordField, 'ios-field')}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              {copiedField === 'ios-field' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'ios-field' ? 'Copied!' : 'Copy Field'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: App Title Suggestions (30 Chars) */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
            App Title Candidates (30 Characters Max)
          </span>

          <div className="space-y-2">
            {titleSuggestions.map((title, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-white">&quot;{title}&quot;</span>
                  <span className="text-[10px] text-slate-400">({title.length} chars)</span>
                </div>

                <button
                  onClick={() => copyToClipboard(title, `title-${idx}`)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-slate-300 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-[11px] transition-all flex items-center gap-1"
                >
                  {copiedField === `title-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === `title-${idx}` ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Subtitle Suggestions */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
            Subtitle Candidates (30 Characters Max)
          </span>

          <div className="space-y-2">
            {subtitleSuggestions.map((sub, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-white">&quot;{sub}&quot;</span>
                  <span className="text-[10px] text-slate-400">({sub.length} chars)</span>
                </div>

                <button
                  onClick={() => copyToClipboard(sub, `sub-${idx}`)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-slate-300 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-[11px] transition-all flex items-center gap-1"
                >
                  {copiedField === `sub-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === `sub-${idx}` ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
