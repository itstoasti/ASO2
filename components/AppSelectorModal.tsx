import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrackedApp } from '@/lib/rank-tracker-types';
import { getTrackedKeywords } from '@/lib/rank-tracker-storage';
import { Search, X, Plus, Apple, Play, Check, Trash2 } from 'lucide-react';

interface AppSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: TrackedApp[];
  selectedApp: TrackedApp | null;
  onSelectApp: (app: TrackedApp) => void;
  onOpenAddApp: () => void;
  onRemoveApp: (appId: string) => void;
  onAddLinkedPlatform?: (baseApp: TrackedApp, targetPlatform: 'ios' | 'android') => void;
}

export function AppSelectorModal({
  isOpen,
  onClose,
  apps,
  selectedApp,
  onSelectApp,
  onOpenAddApp,
  onRemoveApp,
  onAddLinkedPlatform,
}: AppSelectorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const allKeywords = getTrackedKeywords();

  // Group apps by brand / clean name
  const groupedList: { iosApp?: TrackedApp; androidApp?: TrackedApp; primaryApp: TrackedApp }[] = [];

  apps.forEach((app) => {
    const appNameClean = app.name.toLowerCase().split(':')[0].split('-')[0].replace(/[^a-z0-9]/g, '').trim();
    const devClean = app.developer.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    // Find matching group across platforms (title match, developer match, or cross brand match)
    const existingGroup = groupedList.find((g) => {
      const gIosName = g.iosApp?.name.toLowerCase().split(':')[0].split('-')[0].replace(/[^a-z0-9]/g, '').trim() || '';
      const gAndroidName = g.androidApp?.name.toLowerCase().split(':')[0].split('-')[0].replace(/[^a-z0-9]/g, '').trim() || '';
      const gIosDev = g.iosApp?.developer.toLowerCase().replace(/[^a-z0-9]/g, '').trim() || '';
      const gAndroidDev = g.androidApp?.developer.toLowerCase().replace(/[^a-z0-9]/g, '').trim() || '';

      const titleMatch =
        (appNameClean.length >= 3 && gIosName.length >= 3 && (gIosName.includes(appNameClean) || appNameClean.includes(gIosName))) ||
        (appNameClean.length >= 3 && gAndroidName.length >= 3 && (gAndroidName.includes(appNameClean) || appNameClean.includes(gAndroidName)));

      const devMatch =
        (devClean.length >= 4 && gIosDev.length >= 4 && (gIosDev.includes(devClean) || devClean.includes(gIosDev))) ||
        (devClean.length >= 4 && gAndroidDev.length >= 4 && (gAndroidDev.includes(devClean) || devClean.includes(gAndroidDev)));

      const crossMatch =
        (gIosName.length >= 4 && devClean.length >= 4 && (devClean.includes(gIosName) || gIosName.includes(devClean))) ||
        (gAndroidName.length >= 4 && devClean.length >= 4 && (devClean.includes(gAndroidName) || gAndroidName.includes(devClean))) ||
        (appNameClean.length >= 4 && gIosDev.length >= 4 && (gIosDev.includes(appNameClean) || appNameClean.includes(gIosDev))) ||
        (appNameClean.length >= 4 && gAndroidDev.length >= 4 && (gAndroidDev.includes(appNameClean) || appNameClean.includes(gAndroidDev)));

      return (titleMatch || devMatch || crossMatch) && (app.platform === 'ios' ? !g.iosApp : !g.androidApp);
    });

    if (existingGroup) {
      if (app.platform === 'ios') existingGroup.iosApp = app;
      if (app.platform === 'android') existingGroup.androidApp = app;
      if (app.name !== 'App' && existingGroup.primaryApp.name === 'App') {
        existingGroup.primaryApp = app;
      }
    } else {
      groupedList.push({
        iosApp: app.platform === 'ios' ? app : undefined,
        androidApp: app.platform === 'android' ? app : undefined,
        primaryApp: app,
      });
    }
  });

  const filteredGroups = groupedList.filter((group) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const iosName = group.iosApp?.name.toLowerCase() || '';
    const androidName = group.androidApp?.name.toLowerCase() || '';
    const dev = (group.iosApp?.developer || group.androidApp?.developer || '').toLowerCase();
    return iosName.includes(q) || androidName.includes(q) || dev.includes(q);
  });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-[95vw] sm:w-full sm:max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 z-10 space-y-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Select App to Track
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {groupedList.length} app brand{groupedList.length === 1 ? '' : 's'} tracked across stores ({apps.length} total entries)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddApp();
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add App</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracked apps by name or developer..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Multi-Column App Cards Grid */}
        <div className="overflow-y-auto max-h-[60vh] pr-1 space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <Search className="w-6 h-6 mx-auto text-slate-400" />
              <p className="font-bold text-slate-700 dark:text-slate-300">No matching apps found.</p>
              <p className="text-slate-400">Try adjusting your search query or add a new app.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredGroups.map((group, idx) => {
                const displayApp = group.iosApp || group.androidApp || group.primaryApp;
                const iosKwCount = group.iosApp ? allKeywords.filter((k) => k.targetAppId === group.iosApp!.id).length : 0;
                const androidKwCount = group.androidApp ? allKeywords.filter((k) => k.targetAppId === group.androidApp!.id).length : 0;

                const isSelectedGroup = (group.iosApp && selectedApp?.id === group.iosApp.id) || (group.androidApp && selectedApp?.id === group.androidApp.id);

                return (
                  <div
                    key={idx}
                    className={`bg-slate-50/70 dark:bg-slate-800/40 border rounded-xl p-3 space-y-3 transition-all flex flex-col justify-between ${
                      isSelectedGroup
                        ? 'border-blue-500/80 ring-2 ring-blue-500/10 shadow-xs bg-blue-50/20 dark:bg-blue-950/20'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Card Main Info */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                        {displayApp.iconUrl ? (
                          <img src={displayApp.iconUrl} alt={displayApp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-extrabold text-blue-600">
                            {displayApp.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {displayApp.name.split(':')[0].split('-')[0].trim()}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {displayApp.developer}
                        </p>
                      </div>
                    </div>

                    {/* Platform Entry Switchers */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* iOS Pill */}
                        {group.iosApp ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectApp(group.iosApp!);
                                onClose();
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                selectedApp?.id === group.iosApp.id
                                  ? 'bg-sky-600 text-white shadow-2xs'
                                  : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100'
                              }`}
                            >
                              <Apple className="w-3 h-3 text-sky-600 fill-sky-600" />
                              <span>iOS ({iosKwCount})</span>
                              {selectedApp?.id === group.iosApp.id && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveApp(group.iosApp!.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                              title="Delete iOS version"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (onAddLinkedPlatform && displayApp) {
                                onAddLinkedPlatform(displayApp, 'ios');
                              }
                            }}
                            className="px-2 py-0.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ iOS</span>
                          </button>
                        )}

                        {/* Android Pill */}
                        {group.androidApp ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectApp(group.androidApp!);
                                onClose();
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                selectedApp?.id === group.androidApp.id
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                              <span>Android ({androidKwCount})</span>
                              {selectedApp?.id === group.androidApp.id && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveApp(group.androidApp!.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                              title="Delete Android version"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (onAddLinkedPlatform && displayApp) {
                                onAddLinkedPlatform(displayApp, 'android');
                              }
                            }}
                            className="px-2 py-0.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Android</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
