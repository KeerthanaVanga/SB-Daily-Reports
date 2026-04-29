'use client';

import { useRef, useState, useTransition, useCallback } from 'react';
import { processReports, ActionState } from '../actions/processReport';
import ReportView from './ReportView';
import { downloadStyledExcel } from '../../lib/excelExport';

const EMPTY_STATE: ActionState = { reports: [] };

export default function DailyUploadSection() {
  const [state, setState] = useState<ActionState>(EMPTY_STATE);
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const names = Array.from(fileList).map(f => f.name);
    setSelectedFiles(names);
    const fd = new FormData();
    Array.from(fileList).forEach(f => fd.append('files', f));
    startTransition(async () => {
      const result = await processReports(fd);
      setState(result);
    });
  }, [startTransition]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files),
    [handleFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const reset = () => {
    setState(EMPTY_STATE);
    setSelectedFiles([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const hasReports = state.reports.length > 0;

  return (
    <div className="space-y-8">
      {/* Upload zone */}
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${dragging
            ? 'border-indigo-400 bg-indigo-50/60 scale-[1.01] shadow-md'
            : hasReports
              ? 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'
              : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 shadow-sm'
          }
          ${isPending ? 'pointer-events-none opacity-70' : ''}
          print:hidden`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !isPending && inputRef.current?.click()}
        role="button"
        aria-label="Upload CSV files"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
        <div className="flex flex-col items-center justify-center px-8 py-10 gap-3 text-center">
          {isPending ? (
            <>
              <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-indigo-700">Processing your data…</p>
              <p className="text-xs text-slate-400">{selectedFiles.join(', ')}</p>
            </>
          ) : dragging ? (
            <>
              <span className="text-5xl">📂</span>
              <p className="text-base font-semibold text-indigo-700">Release to upload</p>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <svg className="h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {hasReports ? 'Upload new files to refresh' : 'Drag & drop CSV files here'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">or click to browse — one file per brand, multiple supported</p>
              </div>
              {selectedFiles.length > 0 && !hasReports && (
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {selectedFiles.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-700">
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                      </svg>
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 print:hidden">
          <svg className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-rose-700">{state.error}</p>
        </div>
      )}

      {/* Action bar */}
      {hasReports && (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="text-sm text-slate-500">
            Generated report for{' '}
            <span className="font-semibold text-slate-700">
              {state.reports.map(r => r.brandName).join(', ')}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Save as PDF
            </button>
            <button
              onClick={() => downloadStyledExcel(state.reports)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Excel
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Reports */}
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
