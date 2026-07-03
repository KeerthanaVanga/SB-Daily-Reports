'use client';

import { useRef, useState, useTransition, useCallback, useEffect } from 'react';
import { processMonthlyCSV, isMonthlyReportCSV, STANDARD_GROUP_NAMES, ADHOC_GROUP_NAME, BRAND_CONFIGS, detectBrand, ADHOC_NAMES } from '../../lib/monthlyReportProcessor';
import type { AggregatedRow, MonthlyReport, KeyAlias } from '../../lib/monthlyReportProcessor';

async function downloadMonthlyExcel(report: MonthlyReport): Promise<void> {
  const XLSX = await import('xlsx-js-style');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wb: any = XLSX.utils.book_new();

  const NUM_COLS = 11;
  const COL_HEADERS = ['Bonus Key','Issued','Issued Amt (€)','Issued Players','Act. Rate','Act. Amt (€)','Act. Players','Usage Rate','Payout Amt (€)','Payout Rate','Avg Bet (€)'];

  function mkStyle(bg: string, bold: boolean, color: string, align = 'left') {
    const b = { style: 'thin', color: { rgb: 'CBD5E1' } };
    return { fill: { patternType: 'solid', fgColor: { rgb: bg } }, font: { bold, color: { rgb: color }, sz: 9 }, alignment: { horizontal: align, vertical: 'center' }, border: { top: b, bottom: b, left: b, right: b } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws: Record<string, any> = {};
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let r = 0;

  const addr = (row: number, col: number) => XLSX.utils.encode_cell({ r: row, c: col });

  // Title
  const titleStyle = mkStyle('1E3A8A', true, 'FFFFFF', 'center');
  ws[addr(r, 0)] = { v: `Monthly Freebet Report — ${report.brandName}`, t: 's', s: titleStyle };
  for (let c = 1; c < NUM_COLS; c++) ws[addr(r, c)] = { v: '', t: 's', s: titleStyle };
  merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
  r++;

  // Headers
  const hdrStyle = mkStyle('2563EB', true, 'FFFFFF', 'center');
  COL_HEADERS.forEach((h, c) => { ws[addr(r, c)] = { v: h, t: 's', s: hdrStyle }; });
  r++;

  function writeRow(label: string, row: AggregatedRow, bg: string, color: string, bold: boolean) {
    const ls = mkStyle(bg, bold, color, 'left');
    const rs = mkStyle(bg, bold, color, 'right');
    ws[addr(r, 0)] = { v: label, t: 's', s: ls };
    const vals: [number, unknown, string | undefined][] = [
      [1, row.issuedCount,    '#,##0'],
      [2, row.issuedAmount,   '#,##0.00'],
      [3, row.issuedPlayers,  '#,##0'],
      [4, row.activationRate / 100, '0.00%'],
      [5, row.activatedAmount,'#,##0.00'],
      [6, row.activatedPlayers,'#,##0'],
      [7, row.usageRate / 100,'0.00%'],
      [8, row.payoutAmount,   '#,##0.00'],
      [9, row.payoutRate / 100,'0.00%'],
      [10, row.avgBet,        '#,##0.00'],
    ];
    vals.forEach(([c, v, z]) => { ws[addr(r, c)] = { v, t: 'n', ...(z ? { z } : {}), s: rs }; });
    r++;
  }

  // ONE aggregated row per group — no member sub-rows
  for (const g of report.groups) {
    writeRow(g.name, g.total, 'DBEAFE', '1E40AF', true);
  }

  // Monthly total
  writeRow('Monthly Total', report.monthlyTotal, 'FEF08A', '78350F', true);

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: NUM_COLS - 1 } });
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 38 }, { wch: 9 }, { wch: 14 }, { wch: 13 }, { wch: 11 }, { wch: 14 }, { wch: 13 }, { wch: 11 }, { wch: 14 }, { wch: 11 }, { wch: 11 }];
  ws['!rows'] = [{ hpt: 24 }, { hpt: 20 }, ...Array(r - 2).fill({ hpt: 18 })];

  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');
  XLSX.writeFile(wb, `monthly_freebet_report_${report.brandName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

type SortKey = keyof AggregatedRow;
type SortDir = 'asc' | 'desc';

interface UiPromoGroup {
  id: number;
  name: string;
}

interface UserStdGroup {
  id: number;
  name: string;
  keywords: string;
  brand: string; // brand key this group belongs to
}

interface CachedCsv {
  text: string;
  filename: string;
}

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
  onAssignKey,
  keyAliases,
  onRemoveAlias,
  onHideKey,
  onDemoteKey,
}: {
  report: MonthlyReport;
  reportIdx: number;
  sortKey: SortKey | null;
  sortDir: SortDir;
  expandedGroups: Set<string>;
  onToggleSort: (k: SortKey) => void;
  onToggleGroup: (key: string) => void;
  onDownload: () => void;
  onAssignKey: (bonusKey: string, groupName: string) => void;
  keyAliases: KeyAlias[];
  onRemoveAlias: (bonusKey: string) => void;
  onHideKey: (bonusKey: string) => void;
  onDemoteKey: (bonusKey: string) => void;
}) {
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const justDropped = useRef(false);

  const sortedGroups = sortKey
    ? [...report.groups]
        .sort((a, b) => cmp(a.total, b.total, sortKey, sortDir))
        .map(g => ({ ...g, members: [...g.members].sort((a, b) => cmp(a, b, sortKey, sortDir)) }))
    : report.groups;
  const sortedIndividuals = sortKey
    ? [...report.individuals].sort((a, b) => cmp(a, b, sortKey, sortDir))
    : report.individuals;

  const bodyRows: React.ReactNode[] = [];

  for (const g of sortedGroups) {
    const gKey = `${reportIdx}:${g.name}`;
    const expanded = expandedGroups.has(gKey);
    const isDropTarget = dragOverGroup === gKey && !!draggedKey;
    bodyRows.push(
      <tr
        key={gKey}
        onClick={() => { if (justDropped.current) { justDropped.current = false; return; } if (!draggedKey) onToggleGroup(gKey); }}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverGroup(gKey); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverGroup(null); }}
        onDrop={e => { e.preventDefault(); justDropped.current = true; const k = e.dataTransfer.getData('text/plain'); if (k) onAssignKey(k, g.name); setDragOverGroup(null); setDraggedKey(null); }}
        className={`cursor-pointer transition-all border-b ${isDropTarget ? 'bg-violet-100 border-violet-400 outline outline-2 outline-violet-400 outline-offset-[-2px]' : 'bg-blue-50 hover:bg-blue-100 border-blue-200'}`}
      >
        {COLS.map(col => (
          <td key={col.key} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${isDropTarget ? 'text-violet-800' : 'text-blue-900'} ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
            {col.key === 'bonusKey' ? (
              <span className="inline-flex items-center gap-2">
                <span className={`text-[10px] transition-transform duration-150 inline-block ${isDropTarget ? 'text-violet-400' : 'text-blue-400'}`} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                {g.name}
                {isDropTarget && <span className="ml-1 text-[10px] font-normal text-violet-500 animate-pulse">Drop here</span>}
              </span>
            ) : col.fmt(g.total)}
          </td>
        ))}
      </tr>
    );
    if (expanded) {
      for (const m of g.members) {
        const isMapped = keyAliases.some(a => a.bonusKey.toLowerCase() === m.bonusKey.toLowerCase());
        bodyRows.push(
          <tr key={`${gKey}-${m.bonusKey}`} className="bg-blue-50/40 hover:bg-blue-50 border-b border-slate-100 transition-colors">
            {COLS.map(col => (
              <td key={col.key} className={`px-3 py-2 text-blue-800 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                {col.key === 'bonusKey' ? (
                  <span className="pl-6 flex items-center gap-2">
                    <span className="text-blue-700 truncate max-w-[200px]">{m.bonusKey}</span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      {isMapped && <span className="text-[9px] text-violet-400 font-semibold bg-violet-50 border border-violet-200 rounded px-1 py-0.5">mapped</span>}
                      <button
                        onClick={e => { e.stopPropagation(); onDemoteKey(m.bonusKey); }}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                        title="Delete — return to unassigned list"
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </span>
                  </span>
                ) : col.fmt(m)}
              </td>
            ))}
          </tr>
        );
      }
    }
  }

  const isDragging = !!draggedKey;

  sortedIndividuals.forEach((ind, i) => {
    const beingDragged = draggedKey === ind.bonusKey;
    bodyRows.push(
      <tr
        key={`${reportIdx}-ind-${ind.bonusKey}`}
        draggable
        onDragStart={e => { e.dataTransfer.setData('text/plain', ind.bonusKey); e.dataTransfer.effectAllowed = 'move'; setDraggedKey(ind.bonusKey); }}
        onDragEnd={() => { setDraggedKey(null); setDragOverGroup(null); }}
        className={`border-b border-slate-100 transition-all cursor-grab active:cursor-grabbing select-none ${beingDragged ? 'opacity-40 bg-violet-50' : i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-50'}`}
      >
        {COLS.map(col => (
          <td key={col.key} className={`px-3 py-2.5 text-slate-700 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
            {col.key === 'bonusKey' ? (
              <span className="flex items-center gap-1.5">
                <span className="text-slate-300 text-[13px] leading-none shrink-0" title="Drag to map to a group">⠿</span>
                <span className="truncate max-w-[200px]">{ind.bonusKey}</span>
                {!isDragging && (
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <span className="text-[9px] text-slate-300 font-normal">drag to group</span>
                    <span className="text-slate-200">|</span>
                    <button onClick={e => { e.stopPropagation(); onHideKey(ind.bonusKey); }} className="text-[10px] text-rose-400 hover:text-rose-600 font-semibold transition-colors" title="Remove from report">× Remove</button>
                  </span>
                )}
              </span>
            ) : col.fmt(ind)}
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
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [promoGroups, setPromoGroups] = useState<UiPromoGroup[]>([]);
  const [showPromoPanel, setShowPromoPanel] = useState(false);
  const [showPromoManager, setShowPromoManager] = useState(false);
  const [userStdGroups, setUserStdGroups] = useState<UserStdGroup[]>([]);
  const [keyAliases, setKeyAliases] = useState<KeyAlias[]>([]);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [demotedKeys, setDemotedKeys] = useState<string[]>([]);
  const [cachedCsvs, setCachedCsvs] = useState<CachedCsv[]>([]);
  const [needsReprocess, setNeedsReprocess] = useState(false);
  const [addingToBrand, setAddingToBrand] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupKeywords, setNewGroupKeywords] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nextPromoId = useRef(0);
  const nextUserGroupId = useRef(0);

  // Persist aliases and user-added groups to localStorage
  useEffect(() => {
    try { const s = localStorage.getItem('promoKeyAliases'); if (s) setKeyAliases(JSON.parse(s)); } catch {}
    try { const s = localStorage.getItem('userStdGroups'); if (s) { const g = JSON.parse(s); setUserStdGroups(g); if (g.length) nextUserGroupId.current = Math.max(...g.map((x: UserStdGroup) => x.id)) + 1; } } catch {}
    try { const s = localStorage.getItem('hiddenPromoKeys'); if (s) setHiddenKeys(JSON.parse(s)); } catch {}
    try { const s = localStorage.getItem('demotedPromoKeys'); if (s) setDemotedKeys(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem('promoKeyAliases', JSON.stringify(keyAliases)); } catch {} }, [keyAliases]);
  useEffect(() => { try { localStorage.setItem('userStdGroups', JSON.stringify(userStdGroups)); } catch {} }, [userStdGroups]);
  useEffect(() => { try { localStorage.setItem('hiddenPromoKeys', JSON.stringify(hiddenKeys)); } catch {} }, [hiddenKeys]);
  useEffect(() => { try { localStorage.setItem('demotedPromoKeys', JSON.stringify(demotedKeys)); } catch {} }, [demotedKeys]);

  const addPromoGroup = useCallback(() => {
    setPromoGroups(prev => [...prev, { id: nextPromoId.current++, name: '' }]);
    setShowPromoPanel(true);
  }, []);

  const updatePromoGroupName = useCallback((id: number, value: string) => {
    setPromoGroups(prev => prev.map(g => g.id === id ? { ...g, name: value } : g));
  }, []);

  const removePromoGroup = useCallback((id: number) => {
    setPromoGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  function addUserStdGroupToBrand(brand: string) {
    if (!newGroupName.trim()) return;
    setUserStdGroups(prev => [...prev, { id: nextUserGroupId.current++, name: newGroupName.trim(), keywords: newGroupKeywords.trim(), brand }]);
    setNewGroupName('');
    setNewGroupKeywords('');
    setAddingToBrand(null);
  }

  function removeUserStdGroup(id: number) {
    setUserStdGroups(prev => prev.filter(g => g.id !== id));
  }

  function assignKey(bonusKey: string, groupName: string) {
    const newAliases = [
      ...keyAliases.filter(a => a.bonusKey.toLowerCase() !== bonusKey.toLowerCase()),
      { bonusKey, groupName },
    ];
    const newDemoted = demotedKeys.filter(k => k.toLowerCase() !== bonusKey.toLowerCase());
    setKeyAliases(newAliases);
    setDemotedKeys(newDemoted);
    if (!cachedCsvs.length) return;
    startTransition(async () => {
      const newReports: MonthlyReport[] = [];
      const newErrors: string[] = [];
      for (const { text, filename } of cachedCsvs) {
        try {
          newReports.push(processMonthlyCSV(text, filename, buildCustomGroups(filename), newAliases, hiddenKeys, newDemoted));
        } catch (e) {
          newErrors.push(`${filename}: ${e instanceof Error ? e.message : 'Unexpected error.'}`);
        }
      }
      applyResults(newReports, newErrors);
    });
  }

  function removeAlias(bonusKey: string) {
    const newAliases = keyAliases.filter(a => a.bonusKey.toLowerCase() !== bonusKey.toLowerCase());
    setKeyAliases(newAliases);
    if (!cachedCsvs.length) return;
    startTransition(async () => {
      const newReports: MonthlyReport[] = [];
      const newErrors: string[] = [];
      for (const { text, filename } of cachedCsvs) {
        try {
          newReports.push(processMonthlyCSV(text, filename, buildCustomGroups(filename), newAliases, hiddenKeys, demotedKeys));
        } catch (e) {
          newErrors.push(`${filename}: ${e instanceof Error ? e.message : 'Unexpected error.'}`);
        }
      }
      applyResults(newReports, newErrors);
    });
  }

  function demoteKey(bonusKey: string) {
    const newDemoted = [...demotedKeys.filter(k => k.toLowerCase() !== bonusKey.toLowerCase()), bonusKey];
    const newAliases = keyAliases.filter(a => a.bonusKey.toLowerCase() !== bonusKey.toLowerCase());
    setDemotedKeys(newDemoted);
    setKeyAliases(newAliases);
    if (!cachedCsvs.length) return;
    startTransition(async () => {
      const newReports: MonthlyReport[] = [];
      const newErrors: string[] = [];
      for (const { text, filename } of cachedCsvs) {
        try {
          newReports.push(processMonthlyCSV(text, filename, buildCustomGroups(filename), newAliases, hiddenKeys, newDemoted));
        } catch (e) {
          newErrors.push(`${filename}: ${e instanceof Error ? e.message : 'Unexpected error.'}`);
        }
      }
      applyResults(newReports, newErrors);
    });
  }

  function hideKey(bonusKey: string) {
    const newHidden = [...hiddenKeys.filter(k => k.toLowerCase() !== bonusKey.toLowerCase()), bonusKey];
    setHiddenKeys(newHidden);
    if (!cachedCsvs.length) return;
    startTransition(async () => {
      const newReports: MonthlyReport[] = [];
      const newErrors: string[] = [];
      for (const { text, filename } of cachedCsvs) {
        try {
          newReports.push(processMonthlyCSV(text, filename, buildCustomGroups(filename), keyAliases, newHidden, demotedKeys));
        } catch (e) {
          newErrors.push(`${filename}: ${e instanceof Error ? e.message : 'Unexpected error.'}`);
        }
      }
      applyResults(newReports, newErrors);
    });
  }

  function unhideKey(bonusKey: string) {
    const newHidden = hiddenKeys.filter(k => k.toLowerCase() !== bonusKey.toLowerCase());
    setHiddenKeys(newHidden);
    if (!cachedCsvs.length) return;
    startTransition(async () => {
      const newReports: MonthlyReport[] = [];
      const newErrors: string[] = [];
      for (const { text, filename } of cachedCsvs) {
        try {
          newReports.push(processMonthlyCSV(text, filename, buildCustomGroups(filename), keyAliases, newHidden, demotedKeys));
        } catch (e) {
          newErrors.push(`${filename}: ${e instanceof Error ? e.message : 'Unexpected error.'}`);
        }
      }
      applyResults(newReports, newErrors);
    });
  }

  const allGroupNames = [
    ...STANDARD_GROUP_NAMES,
    ...userStdGroups.filter(g => g.name.trim()).map(g => g.name.trim()),
  ];

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

  function buildCustomGroups(filename: string) {
    const fileBrand = detectBrand(filename);
    return [
      ...promoGroups.filter(g => g.name.trim()).map(g => ({ name: g.name.trim(), keywords: [g.name.trim()] })),
      ...userStdGroups
        .filter(g => g.name.trim() && (!fileBrand || !g.brand || g.brand === fileBrand))
        .map(g => ({
          name: g.name.trim(),
          keywords: g.keywords ? g.keywords.split(',').map(k => k.trim()).filter(Boolean) : [g.name.trim()],
        })),
    ];
  }

  function applyResults(newReports: MonthlyReport[], newErrors: string[], expandAll = false) {
    setReports(newReports);
    setErrors(newErrors);
    setNeedsReprocess(false);
    if (expandAll && newReports.length > 0) {
      setExpandedGroups(new Set(newReports.flatMap((r, ri) => r.groups.map(g => `${ri}:${g.name}`))));
    }
  }

  function generate() {
    const files = slots.filter(Boolean) as File[];
    if (!files.length) return;
    const aliases = keyAliases;
    startTransition(async () => {
      const newReports: MonthlyReport[] = [];
      const newErrors: string[] = [];
      const csvCache: CachedCsv[] = [];
      for (const file of files) {
        try {
          const text = await file.text();
          if (!isMonthlyReportCSV(text)) {
            newErrors.push(`${file.name}: This does not appear to be a monthly freebet report CSV.`);
            continue;
          }
          csvCache.push({ text, filename: file.name });
          newReports.push(processMonthlyCSV(text, file.name, buildCustomGroups(file.name), aliases, hiddenKeys, demotedKeys));
        } catch (e) {
          newErrors.push(`${file.name}: ${e instanceof Error ? e.message : 'Unexpected error processing file.'}`);
        }
      }
      setCachedCsvs(csvCache);
      applyResults(newReports, newErrors, true);
    });
  }

  function reprocess() {
    if (!cachedCsvs.length) return;
    const aliases = keyAliases;
    startTransition(async () => {
      const newReports: MonthlyReport[] = [];
      const newErrors: string[] = [];
      for (const { text, filename } of cachedCsvs) {
        try {
          newReports.push(processMonthlyCSV(text, filename, buildCustomGroups(filename), aliases, hiddenKeys, demotedKeys));
        } catch (e) {
          newErrors.push(`${filename}: ${e instanceof Error ? e.message : 'Unexpected error.'}`);
        }
      }
      applyResults(newReports, newErrors);
    });
  }

  function reset() {
    setReports([]);
    setErrors([]);
    setCachedCsvs([]);
    setNeedsReprocess(false);
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

      {/* ── Promo Key Manager (always visible) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm print:hidden overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPromoManager(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              Promo Key Manager
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {STANDARD_GROUP_NAMES.length + userStdGroups.filter(g => g.name.trim()).length} groups
              </span>
              {keyAliases.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                  {keyAliases.length} mapping{keyAliases.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">View standard promo keys, add new ones, and manage key mappings</p>
          </div>
          <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${showPromoManager ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {showPromoManager && (
          <div className="border-t border-slate-100 px-5 py-5 space-y-6">

            {/* Brand-specific promo key sections */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Standard Promo Keys by Brand</p>
              {Object.entries(BRAND_CONFIGS).map(([key, cfg]) => {
                const isActive = reports.some(r => r.brand === key);
                const brandUserGroups = userStdGroups.filter(g => g.brand === key);
                const isAdding = addingToBrand === key;
                return (
                  <div key={key} className={`rounded-xl border px-4 py-3 ${isActive ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200 bg-slate-50/40'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs font-bold flex items-center gap-2 ${isActive ? 'text-teal-700' : 'text-slate-600'}`}>
                        {cfg.displayName}
                        {isActive && <span className="rounded-full bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5">Active</span>}
                        <span className="text-[10px] font-normal text-slate-400">{cfg.groupNames.length + brandUserGroups.length} groups</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => { setAddingToBrand(isAdding ? null : key); setNewGroupName(''); setNewGroupKeywords(''); }}
                        className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 transition-colors ${isAdding ? 'bg-slate-200 text-slate-600' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
                      >
                        {isAdding ? 'Cancel' : '+ Add'}
                      </button>
                    </div>

                    {/* Standard promo key chips (excludes Ad-hoc group) */}
                    <div className="flex flex-wrap gap-1.5">
                      {cfg.groupNames.filter(n => n !== ADHOC_GROUP_NAME).map(name => (
                        <span key={name} className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border ${isActive ? 'bg-teal-100 border-teal-300 text-teal-800' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>{name}</span>
                      ))}
                      {brandUserGroups.map(g => (
                        <span key={g.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-300 px-2.5 py-1 text-[11px] font-medium text-teal-700">
                          {g.name}
                          {g.keywords && <span className="text-teal-400 font-normal text-[10px]">({g.keywords})</span>}
                          <button onClick={() => removeUserStdGroup(g.id)} className="ml-0.5 text-teal-400 hover:text-rose-500 leading-none text-xs transition-colors">×</button>
                        </span>
                      ))}
                    </div>

                    {/* Ad-hoc / VIP FBTs / Cashbacks subsection */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/70">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Ad-hoc / VIP FBTs / Cashbacks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(ADHOC_NAMES as readonly string[]).filter(n => key === 'roosterbet' || n !== 'Mikey').map(n => (
                          <span key={n} className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border ${isActive ? 'bg-teal-100 border-teal-300 text-teal-800' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>{n}</span>
                        ))}
                      </div>
                    </div>

                    {isAdding && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2 flex-wrap sm:flex-nowrap">
                        <input
                          type="text"
                          placeholder="Promo key name"
                          value={newGroupName}
                          onChange={e => setNewGroupName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addUserStdGroupToBrand(key)}
                          autoFocus
                          className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                        <input
                          type="text"
                          placeholder="Keywords, comma-separated (optional)"
                          value={newGroupKeywords}
                          onChange={e => setNewGroupKeywords(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addUserStdGroupToBrand(key)}
                          className="flex-[2] min-w-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                        <button
                          onClick={() => addUserStdGroupToBrand(key)}
                          disabled={!newGroupName.trim()}
                          className="rounded-lg bg-teal-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-teal-700 transition-colors shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Key mappings */}
            {keyAliases.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Key Mappings</p>
                <div className="space-y-1.5">
                  {keyAliases.map(alias => (
                    <div key={alias.bonusKey} className="flex items-center gap-2 text-xs bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                      <span className="font-mono text-slate-600 truncate max-w-[220px]">{alias.bonusKey}</span>
                      <span className="text-violet-400 shrink-0">→</span>
                      <span className="font-semibold text-violet-700 truncate">{alias.groupName}</span>
                      <button onClick={() => removeAlias(alias.bonusKey)} className="ml-auto shrink-0 text-[10px] text-rose-400 hover:text-rose-600 font-semibold transition-colors">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden keys restore section */}
            {hiddenKeys.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Hidden Keys ({hiddenKeys.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {hiddenKeys.map(k => (
                    <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-medium text-rose-600">
                      <span className="truncate max-w-[200px]">{k}</span>
                      <button onClick={() => unhideKey(k)} className="text-rose-400 hover:text-teal-600 font-semibold transition-colors text-[10px]" title="Restore to report">↩ Restore</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* ── Seasonal Promo Keys ── */}
      {!hasReports && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm print:hidden overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPromoPanel(p => !p)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Seasonal Promo Keys
                {promoGroups.filter(g => g.name.trim()).length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                    {promoGroups.filter(g => g.name.trim()).length} added
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Optional — add sport-specific promo groups for this month's seasonal events
              </p>
            </div>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showPromoPanel ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {showPromoPanel && (
            <div className="border-t border-slate-100 px-5 py-4 space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Any promo keys containing this name will be aggregated as a group instead of going into <span className="font-semibold text-slate-500">Ad-hoc / VIP</span>. Match is case-insensitive.
              </p>

              {promoGroups.length === 0 && (
                <p className="text-xs text-slate-400 italic py-1">No promo keys added yet.</p>
              )}

              {promoGroups.map(group => (
                <div key={group.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Promo key name (e.g. Copa América 2025)"
                    value={group.name}
                    onChange={e => updatePromoGroupName(group.id, e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removePromoGroup(group.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
                    aria-label="Remove"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addPromoGroup}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors mt-1"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Promo Group
              </button>
            </div>
          )}
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
                    {(() => { const b = detectBrand(file.name); return b ? <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-teal-600 text-white px-2 py-0.5">{BRAND_CONFIGS[b].displayName}</span> : <p className="text-[10px] text-slate-400">Click to replace</p>; })()}
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

      {/* ── Re-apply banner ── */}
      {hasReports && needsReprocess && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 print:hidden">
          <p className="text-sm text-violet-700 font-medium">Key mappings updated — re-apply to see changes in the report.</p>
          <button
            onClick={reprocess}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 px-3 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition-all shrink-0"
          >
            {isPending ? <><div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Re-applying…</> : 'Re-apply Mappings'}
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
              onAssignKey={assignKey}
              keyAliases={keyAliases}
              onRemoveAlias={removeAlias}
              onHideKey={hideKey}
              onDemoteKey={demoteKey}
            />
          ))}
        </div>
      )}

    </div>
  );
}
