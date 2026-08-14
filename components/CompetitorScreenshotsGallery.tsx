import React, { useState } from 'react';
import { CompetitorApp } from '@/lib/competitor-types';
import { TrackedApp } from '@/lib/rank-tracker-types';
import { X, ChevronLeft, ChevronRight, Apple, Play, ZoomIn, Image } from 'lucide-react';
import { Badge } from './Badge';

interface CompetitorScreenshotsGalleryProps {
  targetApp: TrackedApp & Partial<CompetitorApp>;
  competitors: CompetitorApp[];
}

export function CompetitorScreenshotsGallery({
  targetApp,
  competitors,
}: CompetitorScreenshotsGalleryProps) {
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<{
    url: string;
    appName: string;
    index: number;
    total: number;
  } | null>(null);

  const allApps = [
    { ...targetApp, isTarget: true } as CompetitorApp & { isTarget: boolean },
    ...competitors.map((c) => ({ ...c, isTarget: false })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Image className="w-4 h-4 text-blue-500" />
            <span>Creative & Screenshot Funnel Inspection</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare visual value propositions, screenshot orientation, typography, and call-to-actions.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {allApps.map((app) => {
          const isTarget = app.isTarget;
          const screenshots = app.screenshots || [];

          return (
            <div
              key={app.id}
              className={`p-5 rounded-2xl border transition-all ${
                isTarget
                  ? 'bg-blue-50/20 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800/80 ring-1 ring-blue-500/10'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* App Label Bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {app.iconUrl ? (
                    <img
                      src={app.iconUrl}
                      alt={app.name}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : null}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {app.name}
                      </h4>
                      {isTarget ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase">
                          Your App
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">
                          Competitor
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{app.developer}</p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  {screenshots.length} Screenshots
                </span>
              </div>

              {/* Horizontal Scroll Screenshots Slider */}
              {screenshots.length > 0 ? (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                  {screenshots.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        setSelectedLightboxImage({
                          url,
                          appName: app.name,
                          index: idx + 1,
                          total: screenshots.length,
                        })
                      }
                      className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                      <img
                        src={url}
                        alt={`${app.name} screenshot ${idx + 1}`}
                        className="h-64 sm:h-72 w-auto object-cover bg-slate-100 dark:bg-slate-800"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement)?.style.setProperty('display', 'none');
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-2 rounded-full bg-white/90 text-slate-900 shadow-md">
                          <ZoomIn className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Image className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    No screenshots fetched for this application.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Fullscreen Modal */}
      {selectedLightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center">
            {/* Header info */}
            <div className="w-full flex items-center justify-between text-white mb-3">
              <div>
                <h4 className="text-sm font-bold">{selectedLightboxImage.appName}</h4>
                <p className="text-xs text-slate-400">
                  Screenshot {selectedLightboxImage.index} of {selectedLightboxImage.total}
                </p>
              </div>
              <button
                onClick={() => setSelectedLightboxImage(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image display */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700 max-h-[80vh]">
              <img
                src={selectedLightboxImage.url}
                alt="Full resolution preview"
                referrerPolicy="no-referrer"
                className="max-h-[80vh] w-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
