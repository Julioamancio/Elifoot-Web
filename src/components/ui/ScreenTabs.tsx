import React from 'react';
import { cn } from '../../lib/utils';

interface ScreenTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface ScreenTabsProps {
  items: readonly ScreenTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function ScreenTabs({ items, activeTab, onChange, className }: ScreenTabsProps) {
  return (
    <div className={cn('overflow-x-auto pb-1', className)}>
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
        {items.map(item => {
          const isActive = item.id === activeTab;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'flex min-w-max items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all',
                isActive
                  ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-sky-500/15 text-white shadow-lg shadow-emerald-950/20'
                  : 'border-transparent bg-slate-800/70 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200',
              )}
            >
              {item.icon ? <span className={cn('shrink-0', isActive ? 'text-emerald-400' : 'text-slate-500')}>{item.icon}</span> : null}
              <span>{item.label}</span>
              {item.badge !== undefined ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-black',
                    isActive ? 'bg-white/10 text-emerald-300' : 'bg-slate-700 text-slate-300',
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
