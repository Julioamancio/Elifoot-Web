import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'danger' | 'warning';
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  tone = 'danger',
}: ConfirmModalProps) {
  if (!open) return null;

  const accentClasses =
    tone === 'warning'
      ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-400';

  const buttonClasses =
    tone === 'warning'
      ? 'bg-yellow-500/90 text-slate-950 hover:bg-yellow-400'
      : 'bg-rose-600 text-white hover:bg-rose-500';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
        <div className={`h-1.5 w-full ${tone === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-gradient-to-r from-rose-500 to-orange-500'}`} />
        <div className="p-6">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${accentClasses}`}>
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-2xl font-bold text-slate-100">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onCancel}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-700"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`rounded-xl px-5 py-3 text-sm font-bold transition-colors ${buttonClasses}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
