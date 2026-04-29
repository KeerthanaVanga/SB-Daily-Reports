'use client';

import { useRef, useState, useTransition } from 'react';
import { processMonthlyReport } from '../actions/monthlyReport';
import { downloadMonthlyExcel } from '../../lib/monthlyReportExcelExport';
import type { AggregatedRow, MonthlyReport } from '../../lib/monthlyReportProcessor';

type SortKey = keyof AggregatedRow;
type SortDir = 'asc' | 'desc';

const MAX_BRANDS = 6;

interface ColDef {
  key: SortKey;
  label: string;
  fmt: (r: AggregatedRow) => string;
  align: 'left' | 'right';
}

function fmtAmt(n: number) { return n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPct(n: number) { return n.toFixed(2) + '%'; }

const COLS: ColDef[] = [
  { key: 'bonusKey',         label: 'Bonus Key',       fmt: r => r.bonusKey,                         align: 'left'  },
  { key: 'issuedCount',      label: 'Issued',          fmt: r => r.issuedCount.toLocaleString(),      align: 'right' },
  { key: 'issuedAmount',     label: 'Issued Amt (€)',  fmt: r => fmtAmt(r.issuedAmount),              align: 'right' },
  { key: 'issuedPlayers',    label: 'Players',         fmt: r => r.issuedPlayers.toLocaleString(),    align: 'right' },
  { key: 'activationRate',   label: 'Act. Rate',       fmt: r => fmtPct(r.activationRate),            align: 'right' },
  { key: 'activatedAmount',  label: 'Act. Amt (€)',    fmt: r => fmtAmt(r.activatedAmount),           align: 'right' },
  { key: 'activatedPlayers', label: 'Act. Players',    fmt: r => r.activatedPlayers.toLocaleString(), align: 'right' },
  { key: 'usageRate',        label: 'Usage Rate',      fmt: r => fmtPct(r.usageRate),                 align: 'right' },
  { key: 'payoutAmount',     label: 'Payout Amt (€)',  fmt: r => fmtAmt(r.payoutAmount),              align: 'right' },
  { key: 'payoutRate',       label: 'Payout Rate',     fmt: r => fmtPct(r.payoutRate),                align: 'right' },
  { key: 'avgBet',           label: 'Avg Bet (€)',     fmt: r => fmtAmt(r.avgBet),                   align: 'right' },
];

function cmp(a: AggregatedRow, b: AggregatedRow, key: SortKey, dir: SortDir) {
  const va = a[key], vb = b[key];
  const d = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
  return dir === 'asc' ? d : -d;
}

function ReportTable({
  report,
  reportIdx,
  sortKey,
  sortDir,
  expandedGroups,
  onToggleSort,
  onToggleGroup,
  onDownload,
}: {
  report: MonthlyReport;
  reportIdx: number;
  sortKey: SortKey;
  sortDir: SortDir;
  expandedGroups: Set<string>;
  onToggleSort: (k: SortKey) => void;
  onToggleGroup: (key: string) => void;
  onDownload: () => void;
}) {
  const sortedGroups = [...report.groups]
    .sort((a, b) => cmp(a.total, b.total, sortKey, sortDir))
    .map(g => ({ ...g, members: [...g.members].sort((a, b) => cmp(a, b, sortKey, sortDir)) }));
  const sortedIndividuals = [...report.individuals].sort((a, b) => cmp(a, b, sortKey, sortDir));

  const bodyRows: React.ReactNode[] = [];

  for (const g of sortedGroups) {
    const gKey = `${reportIdx}:${g.name}`;
    const expanded = expandedGroups.has(gKey);
    bodyRows.push(
      <tr key={gKey} onClick={() => onToggleGroup(gKey)} className="bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors border-b border-blue-200">
        {COLS.map(col => (
          <td key={col.key} className={`px-3 py-2.5 font-semibold text-blue-900 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
            {col.key === 'bonusKey' ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-blue-400 text-[10px] transition-transform duration-150 inline-block" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
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
          <tr key={`${gKey}-${m.bonusKey}`} className="bg-blue-50/40 hover:bg-blue-50 border-b border-slate-100 transition-colors">
            {COLS.map(col => (
              <td key={col.key} className={`px-3 py-2 text-blue-800 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                {col.key === 'bonusKey' ? <span className="pl-6 text-blue-700">{m.bonusKey}</span> : col.fmt(m)}
              </td>
            ))}
          </tr>
        );
      }
    }
  }

  sortedIndividuals.forEach((ind, i) => {
    bodyRows.push(
      <tr key={`${reportIdx}-ind-${ind.bonusKey}`} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
        {COLS.map(col => (
          <td key={col.key} className={`px-3 py-2.5 text-slate-700 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
            {col.fmt(ind)}
          </td>
        ))}
      </tr>
    );
  });

  bodyRows.push(
    <tr key={`${reportIdx}-total`} className="bg-amber-100 border-t-2 border-amber-300">
      {COLS.map(col => (
        <td key={col.key} className={`px-3 py-3 font-bold text-amber-900 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
          {col.key === 'bonusKey' ? 'Monthly Total' : col.fmt(report.monthlyTotal)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div>
          <p className="text-sm font-semibold text-slate-800 capitalize">{report.brandName}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {report.groups.length} group{report.groups.length !== 1 ? 's' : ''} · {report.individuals.length} individual bonus{report.individuals.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => onToggleSort(col.key)}
                  className={`px-3 py-2.5 font-semibold text-slate-600 bg-slate-100 border-b-2 border-slate-200 cursor-pointer select-none whitespace-nowrap hover:bg-slate-200 transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key
                      ? <span className="text-teal-600 font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      : <span className="text-slate-300">↕</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{bodyRows}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function MonthlyReportSection() {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [brandCount, setBrandCount] = useState(1);
  const [slots, setSlots] = useState<(File | null)[]>([null]);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('issuedCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const hasReports = reports.length > 0;
  const filledCount = slots.filter(Boolean).length;

  function changeCount(n: number) {
    setBrandCount(n);
    setSlots(prev => {
      const next = [...prev];
      while (next.length < n) next.push(null);
      return next.slice(0, n);
    });
    setReports([]);
    setErrors([]);
  }

  function setSlotFile(i: number, file: File) {
    setSlots(prev => { const next = [...prev]; next[i] = file; return next; });
  }

  function generate() {
    const files = slots.filter(Boolean) as File[];
    if (!files.length) return;
    startTransition(async () => {
      const results = await Promise.all(files.map(file => {
        const fd = new FormData();
        fd.append('file', file);
        return processMonthlyReport(fd);
      }));
      const newReports: MonthlyReport[] = [];
      const newErrors: string[] = [];
      for (const res of results) {
        if (res.report) newReports.push(res.report);
        if (res.error) newErrors.push(res.error);
      }
      setReports(newReports);
      setErrors(newErrors);
      if (newReports.length > 0) {
        setExpandedGroups(new Set(
          newReports.flatMap((r, ri) => r.groups.map(g => `${ri}:${g.name}`))
        ));
      }
    });
  }

  function reset() {
    setReports([]);
    setErrors([]);
    setSlots(Array(brandCount).fill(null));
    setExpandedGroups(new Set());
    inputRefs.current.forEach(r => { if (r) r.value = ''; });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">

      {/* ── Step 1: brand count ── */}
      {!hasReports && (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm print:hidden">
          <p className="text-sm font-semibold text-slate-700 mb-3">How many brands do you want to upload?</p>
          <div className="flex gap-2">
            {Array.from({ length: MAX_BRANDS }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => changeCount(n)}
                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all border
                  ${brandCount === n
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-teal-400 hover:text-teal-600'
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
                  ? 'border-teal-400 bg-teal-50 scale-[1.02] shadow-md'
                  : file
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/40'
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
                onChange={e => { const f = e.target.files?.[0]; if (f) setSlotFile(i, f); }}
              />
              <div className="flex flex-col items-center justify-center p-5 gap-2 text-center h-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Brand {i + 1}</p>
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
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-95 transition-all"
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
            <p className="text-xs text-slate-500">{filledCount} of {brandCount} slot{brandCount !== 1 ? 's' : ''} filled</p>
          )}
        </div>
      )}

      {/* ── Errors ── */}
      {errors.map((err, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 print:hidden">
          <svg className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-rose-700">{err}</p>
        </div>
      ))}

      {/* ── Action bar ── */}
      {hasReports && (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">
            {reports.length} brand report{reports.length !== 1 ? 's' : ''} ready
            <span className="font-normal text-slate-400 ml-2">
              {reports.map(r => r.brandName).join(' • ')}
            </span>
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-95 transition-all"
          >
            ↻ New Report
          </button>
        </div>
      )}

      {/* ── Report tables ── */}
      {hasReports && (
        <div className="space-y-6">
          {reports.map((report, i) => (
            <ReportTable
              key={i}
              report={report}
              reportIdx={i}
              sortKey={sortKey}
              sortDir={sortDir}
              expandedGroups={expandedGroups}
              onToggleSort={toggleSort}
              onToggleGroup={toggleGroup}
              onDownload={() => downloadMonthlyExcel(report)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
