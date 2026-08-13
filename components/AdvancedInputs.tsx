import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Link as LinkIcon, Globe, Sparkles } from 'lucide-react';

interface AdvancedInputsProps {
  appUrl: string;
  setAppUrl: (val: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (val: string) => void;
  onExtractKeywords?: () => void;
  isExtracting?: boolean;
}

export function AdvancedInputs({
  appUrl,
  setAppUrl,
  websiteUrl,
  setWebsiteUrl,
  onExtractKeywords,
  isExtracting = false,
}: AdvancedInputsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto mt-4 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-hidden transition-all shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Advanced Seed Extraction</span>
          {(appUrl || websiteUrl) && (
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>{isOpen ? 'Hide Options' : 'Show Options'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* App Store / Google Play URL */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                App Store or Google Play URL / App ID
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://apps.apple.com/app/id123456"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Optional: Extract target keywords directly from an existing app listing.
              </p>
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Website URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://myfitnessapp.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Optional: Scrape landing page titles & meta keywords to suggest seeds.
              </p>
            </div>
          </div>

          {(appUrl || websiteUrl) && onExtractKeywords && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onExtractKeywords}
                disabled={isExtracting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isExtracting ? 'Extracting Keywords...' : 'Extract Seed Keywords from URL'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
