import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  aside?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, aside }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 px-6 py-5 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.35)] sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-3 text-emerald-400 shadow-lg shadow-slate-950/30">
            {icon}
          </div>
        ) : null}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}
