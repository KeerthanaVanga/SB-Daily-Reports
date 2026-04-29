import { ReactNode } from 'react';

export interface TableRow {
  name: string;
  bets: number;
  turnoverEur: number;
  profitEur: number;
}

interface PairedTableProps {
  topLabel: string;
  bottomLabel: string;
  nameHeader: string;
  topRows: TableRow[];
  bottomRows: TableRow[];
}

function fmt(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProfitBadge({ value }: { value: number }): ReactNode {
  if (value >= 0) {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-700 ring-1 ring-emerald-200">
        +€{fmt(value)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-mono font-semibold text-rose-700 ring-1 ring-rose-200">
      -€{fmt(Math.abs(value))}
    </span>
  );
}

function HalfTable({ rows, nameHeader, side }: { rows: TableRow[]; nameHeader: string; side: 'top' | 'bottom' }) {
  const isTop = side === 'top';
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className={`text-xs font-semibold uppercase tracking-wider ${
          isTop ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
        }`}>
          <th className="px-3 py-2 text-left">{nameHeader}</th>
          <th className="px-3 py-2 text-right">#Bets</th>
          <th className="px-3 py-2 text-right">Turnover</th>
          <th className="px-3 py-2 text-right">Profit</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
            <td className="px-3 py-2 text-slate-700 truncate max-w-[200px]" title={row.name}>
              {row.name}
            </td>
            <td className="px-3 py-2 text-right text-slate-500 font-mono text-xs">{row.bets}</td>
            <td className="px-3 py-2 text-right text-slate-600 font-mono text-xs">€{fmt(row.turnoverEur)}</td>
            <td className="px-3 py-2 text-right">
              <ProfitBadge value={row.profitEur} />
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="px-3 py-4 text-center text-slate-400 text-xs">No data</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function PairedTable({ topLabel, bottomLabel, nameHeader, topRows, bottomRows }: PairedTableProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
      <div>
        <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest">
          {topLabel}
        </div>
        <HalfTable rows={topRows} nameHeader={nameHeader} side="top" />
      </div>
      <div>
        <div className="px-4 py-2 bg-rose-600 text-white text-xs font-bold uppercase tracking-widest">
          {bottomLabel}
        </div>
        <HalfTable rows={bottomRows} nameHeader={nameHeader} side="bottom" />
      </div>
    </div>
  );
}
