'use client';

import { useRef, useState, useTransition, useCallback } from 'react';
import { processMonthlyReport, MonthlyActionState } from '../actions/monthlyReport';
import { downloadMonthlyExcel } from '../../lib/monthlyReportExcelExport';
import type { AggregatedRow } from '../../lib/monthlyReportProcessor';

type SortKey = keyof AggregatedRow;
type SortDir = 'asc' | 'desc';

const EMPTY: MonthlyActionState = {};

interface ColDef {
  key: SortKey;
  label: string;
  fmt: (r: AggregatedRow) => string;
  align: 'left' | 'right';
}

function fmtAmt(n: number): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

const COLS: ColDef[] = [
  { key: 'bonusKey',         label: 'Bonus Key',         fmt: r => r.bonusKey,                         align: 'left'  },
  { key: 'issuedCount',      label: 'Issued',            fmt: r => r.issuedCount.toLocaleString(),      align: 'right' },
  { key: 'issuedAmount',     label: 'Issued Amt (€)',    fmt: r => fmtAmt(r.issuedAmount),              align: 'right' },
  { key: 'issuedPlayers',    label: 'Players',           fmt: r => r.issuedPlayers.toLocaleString(),    align: 'right' },
  { key: 'activationRate',   label: 'Act. Rate',         fmt: r => fmtPct(r.activationRate),            align: 'right' },
  { key: 'activatedAmount',  label: 'Act. Amt (€)',      fmt: r => fmtAmt(r.activatedAmount),           align: 'right' },
  { key: 'activatedPlayers', label: 'Act. Players',      fmt: r => r.activatedPlayers.toLocaleString(), align: 'right' },
  { key: 'usageRate',        label: 'Usage Rate',        fmt: r => fmtPct(r.usageRate),                 align: 'right' },
  { key: 'payoutAmount',     label: 'Payout Amt (€)',    fmt: r => fmtAmt(r.payoutAmount),              align: 'right' },
  { key: 'payoutRate',       label: 'Payout Rate',       fmt: r => fmtPct(r.payoutRate),                align: 'right' },
  { key: 'avgBet',           label: 'Avg Bet (€)',       fmt: r => fmtAmt(r.avgBet),                   align: 'right' },
];

function cmp(a: AggregatedRow, b: AggregatedRow, key: SortKey, dir: SortDir): number {
  const va = a[key], vb = b[key];
  const d = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
  return dir === 'asc' ? d : -d;
}

export default function MonthlyReportSection() {
  const [state, setState] = useState<MonthlyActionState>(EMPTY);
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('issuedCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((fl: FileList | null) => {
    const file = fl?.[0];
    if (!file) return;
    setSelectedFile(file.name);
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const result = await processMonthlyReport(fd);
      setState(result);
      if (result.report) {
        setExpandedGroups(new Set(result.report.groups.map(g => g.name)));
      }
    });
  }, [startTransition]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const reset = () => {
    setState(EMPTY);
    setSelectedFile('');
    setExpandedGroups(new Set());
    if (inputRef.current) inputRef.current.value = '';
  };

  const { report } = state;

  const sortedGroups = report
    ? [...report.groups]
        .sort((a, b) => cmp(a.total, b.total, sortKey, sortDir))
        .map(g => ({ ...g, members: [...g.members].sort((a, b) => cmp(a, b, sortKey, sortDir)) }))
    : [];
  const sortedIndividuals = report
    ? [...report.individuals].sort((a, b) => cmp(a, b, sortKey, sortDir))
    : [];

  // Build table body rows as a flat array
  const bodyRows: React.ReactNode[] = [];

  if (report) {
    for (const g of sortedGroups) {
      const expanded = expandedGroups.has(g.name);
      bodyRows.push(
        <tr
          key={`g-${g.name}`}
          onClick={() => toggleGroup(g.name)}
          className="bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors border-b border-blue-200"
        >
          {COLS.map(col => (
            <td
              key={col.key}
              className={`px-3 py-2.5 font-semibold text-blue-900 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {col.key === 'bonusKey' ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="text-blue-400 text-[10px] transition-transform duration-150 inline-block"
                    style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    ▶
                  </span>
                  {g.name}
                </span>
              ) : col.fmt(g.total)}
            </td>
          ))}
        </tr>
      );

      if (expanded) {
        for (const m of g.members) {
          bodyRows.push(
            <tr key={`m-${m.bonusKey}`} className="bg-blue-50/40 hover:bg-blue-50 border-b border-slate-100 transition-colors">
              {COLS.map(col => (
                <td
                  key={col.key}
                  className={`px-3 py-2 text-blue-800 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.key === 'bonusKey' ? (
                    <span className="pl-6 text-blue-700 font-normal">{m.bonusKey}</span>
                  ) : col.fmt(m)}
                </td>
              ))}
            </tr>
          );
        }
      }
    }

    sortedIndividuals.forEach((ind, i) => {
      bodyRows.push(
        <tr
          key={`i-${ind.bonusKey}`}
          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
        >
          {COLS.map(col => (
            <td
              key={col.key}
              className={`px-3 py-2.5 text-slate-700 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {col.fmt(ind)}
            </td>
          ))}
        </tr>
      );
    });

    // Monthly total
    bodyRows.push(
      <tr key="monthly-total" className="bg-amber-100 border-t-2 border-amber-300">
        {COLS.map(col => (
          <td
            key={col.key}
            className={`px-3 py-3 font-bold text-amber-900 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
          >
            {col.key === 'bonusKey' ? 'Monthly Total' : col.fmt(report.monthlyTotal)}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${dragging
            ? 'border-teal-400 bg-teal-50/60 scale-[1.01] shadow-md'
            : report
              ? 'border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50/30'
              : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/30 shadow-sm'}
          ${isPending ? 'pointer-events-none opacity-70' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files); }}
        onClick={() => !isPending && inputRef.current?.click()}
        role="button"
        aria-label="Upload monthly report CSV"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => handleFile(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center px-8 py-10 gap-3 text-center">
          {isPending ? (
            <>
              <div className="h-12 w-12 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin" />
              <p className="text-sm font-semibold text-teal-700">Processing your data…</p>
              <p className="text-xs text-slate-400">{selectedFile}</p>
            </>
          ) : dragging ? (
            <>
              <span className="text-5xl">📂</span>
              <p className="text-base font-semibold text-teal-700">Release to upload</p>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-2xl bg-teal-100 flex items-center justify-center">
                <svg className="h-7 w-7 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {report ? 'Upload new file to refresh' : 'Drag & drop monthly CSV here'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">or click to browse — single freebet report CSV</p>
              </div>
              {selectedFile && !report && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-0.5 text-xs font-medium text-teal-700">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                  </svg>
                  {selectedFile}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
          <svg className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-rose-700">{state.error}</p>
        </div>
      )}

      {/* Action bar */}
      {report && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{selectedFile}</span>
            {' — '}
            {report.groups.length} group{report.groups.length !== 1 ? 's' : ''},{' '}
            {report.individuals.length} individual bonus{report.individuals.length !== 1 ? 'es' : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => downloadMonthlyExcel(report)}
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

      {/* Report table */}
      {report && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={`px-3 py-2.5 font-semibold text-slate-600 bg-slate-100 border-b-2 border-slate-200 cursor-pointer select-none whitespace-nowrap hover:bg-slate-200 transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key ? (
                          <span className="text-teal-600 font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        ) : (
                          <span className="text-slate-300">↕</span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{bodyRows}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
