import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  position?: 'top' | 'bottom';
}

export function Tooltip({
  content,
  children,
  align = 'center',
  position = 'bottom',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const alignmentClasses =
    align === 'left'
      ? 'left-0 transform translate-x-0'
      : align === 'right'
      ? 'right-0 transform translate-x-0'
      : 'left-1/2 transform -translate-x-1/2';

  const positionClasses =
    position === 'top'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

  const arrowClasses =
    position === 'top'
      ? 'top-full -mt-1 border-t-slate-900/95 dark:border-t-slate-800/95'
      : 'bottom-full -mb-1 border-b-slate-900/95 dark:border-b-slate-800/95';

  return (
    <div
      className="relative inline-flex items-center group cursor-help z-30"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }}
    >
      {children || (
        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 transition-colors" />
      )}

      {isVisible && (
        <div
          className={`absolute ${positionClasses} ${alignmentClasses} z-50 w-60 p-2.5 text-[11px] font-normal leading-normal text-slate-100 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-xl shadow-slate-900/30 border border-slate-700/60 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95`}
        >
          {content}
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${arrowClasses}`}
          />
        </div>
      )}
    </div>
  );
}
