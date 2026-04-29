'use client';

import { useRef, useState, useTransition } from 'react';
import { processReports, ActionState } from '../actions/processReport';
import ReportView from './ReportView';
import { downloadStyledExcel } from '../../lib/excelExport';
import { REQUIRED_COLUMNS } from '../../lib/reportProcessor';

const EMPTY_STATE: ActionState = { reports: [] };
const MAX_BRANDS = 6;

export default function DailyUploadSection() {
  const [state, setState] = useState<ActionState>(EMPTY_STATE);
  const [isPending, startTransition] = useTransition();
  const [brandCount, setBrandCount] = useState(1);
  const [slots, setSlots] = useState<(File | null)[]>([null]);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const hasReports = state.reports.length > 0;
  const filledCount = slots.filter(Boolean).length;

  function changeCount(n: number) {
    setBrandCount(n);
    setSlots(prev => {
      const next = [...prev];
      while (next.length < n) next.push(null);
      return next.slice(0, n);
    });
    setState(EMPTY_STATE);
    setShowHelp(false);
  }

  function setSlotFile(i: number, file: File) {
    setSlots(prev => {
      const next = [...prev];
      next[i] = file;
      return next;
    });
  }

  function generate() {
    const files = slots.filter(Boolean) as File[];
    if (!files.length) return;
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    startTransition(async () => {
      const result = await processReports(fd);
      setState(result);
      setShowHelp(!!result.error);
    });
  }

  function reset() {
    setState(EMPTY_STATE);
    setSlots(Array(brandCount).fill(null));
    setShowHelp(false);
    inputRefs.current.forEach(r => { if (r) r.value = ''; });
  }

  return (
    <div className="space-y-6">

      {/* ── Step 1: brand count ── */}
      {!hasReports && (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm print:hidden">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            How many brands do you want to upload?
          </p>
          <div className="flex gap-2">
            {Array.from({ length: MAX_BRANDS }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => changeCount(n)}
                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all border
                  ${brandCount === n
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: file slots ── */}
      {!hasReports && (
        <div className={`grid gap-4 print:hidden
          ${brandCount === 1 ? 'grid-cols-1 max-w-sm' : brandCount === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}
        >
          {slots.map((file, i) => (
            <div
              key={i}
              className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[130px]
                ${draggingSlot === i
                  ? 'border-indigo-400 bg-indigo-50 scale-[1.02] shadow-md'
                  : file
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40'
                }
                ${isPending ? 'pointer-events-none opacity-60' : ''}`}
              onDragOver={e => { e.preventDefault(); setDraggingSlot(i); }}
              onDragLeave={() => setDraggingSlot(null)}
              onDrop={e => {
                e.preventDefault();
                setDraggingSlot(null);
                const f = e.dataTransfer.files[0];
                if (f) setSlotFile(i, f);
              }}
              onClick={() => inputRefs.current[i]?.click()}
            >
              <input
                ref={el => { inputRefs.current[i] = el; }}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setSlotFile(i, f);
                }}
              />
              <div className="flex flex-col items-center justify-center p-5 gap-2 text-center h-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Brand {i + 1}
                </p>
                {file ? (
                  <>
                    <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-emerald-700 truncate w-full px-1">{file.name}</p>
                    <p className="text-[10px] text-slate-400">Click to replace</p>
                  </>
                ) : (
                  <>
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-slate-500">Drop CSV or click to browse</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Generate button ── */}
      {!hasReports && (
        <div className="flex items-center gap-4 print:hidden">
          <button
            onClick={generate}
            disabled={filledCount === 0 || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-95 transition-all"
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Processing…
              </>
            ) : (
              `Generate Report${filledCount !== 1 ? 's' : ''} (${filledCount})`
            )}
          </button>
          {filledCount > 0 && !isPending && (
            <p className="text-xs text-slate-500">
              {filledCount} of {brandCount} slot{brandCount !== 1 ? 's' : ''} filled
            </p>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {state.error && (
        <div className="space-y-3 print:hidden">
          <div className="flex items-start gap-3 rounded-xl bg-rose-50 border-l-4 border-rose-500 px-4 py-4 shadow-sm">
            <svg className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-rose-900 text-sm">{state.error}</p>
              <button
                onClick={() => setShowHelp(v => !v)}
                className="text-xs text-rose-700 hover:text-rose-900 font-medium mt-2"
              >
                {showHelp ? '✕ Hide' : '? Show'} required columns
              </button>
            </div>
          </div>
          {showHelp && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Required CSV columns:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REQUIRED_COLUMNS.map(col => (
                  <div key={col} className="flex items-center gap-2 text-blue-800">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <code className="bg-white px-2 py-0.5 rounded border border-blue-200 text-xs font-mono">{col}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Action bar (post-generate) ── */}
      {hasReports && (
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-700">
              {state.reports.length === 1 ? '1 brand report' : `${state.reports.length} brand reports`} ready
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {state.reports.map(r => r.brandName).join(' • ')}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-sm font-semibold text-white shadow-sm active:scale-95 transition-all whitespace-nowrap"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              PDF
            </button>
            <button
              onClick={() => downloadStyledExcel(state.reports)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-semibold text-white shadow-sm active:scale-95 transition-all whitespace-nowrap"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Excel
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-95 transition-all whitespace-nowrap"
            >
              ↻ New Report
            </button>
          </div>
        </div>
      )}

      {/* ── Reports ── */}
      {hasReports && (
        <div className="space-y-6">
          {state.reports.map((report, i) => (
            <ReportView key={i} report={report} />
          ))}
        </div>
      )}

    </div>
  );
}
