import { BrandReport } from '../../lib/reportProcessor';

function fmt(n: number) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Row = { name: string; bets: number; turnoverEur: number; profitEur: number };

function HalfSection({ label, nameHeader, rows, side }: {
  label: string;
  nameHeader: string;
  rows: Row[];
  side: 'top' | 'bottom';
}) {
  const isTop = side === 'top';
  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <div className={`text-center text-xs font-bold py-1 text-white ${isTop ? 'bg-green-500' : 'bg-red-400'}`}>
        {label}
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-white text-slate-600">
            <th className="border border-slate-200 px-2 py-1 text-left font-semibold">{nameHeader}</th>
            <th className="border border-slate-200 px-2 py-1 text-right font-semibold">#Bets</th>
            <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Turnover</th>
            <th className="border border-slate-200 px-2 py-1 text-right font-semibold text-green-600">Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-slate-50">
              <td className="border border-slate-200 px-2 py-1 truncate max-w-[180px]" title={row.name}>{row.name}</td>
              <td className="border border-slate-200 px-2 py-1 text-right font-mono">{row.bets}</td>
              <td className="border border-slate-200 px-2 py-1 text-right font-mono">€ {fmt(row.turnoverEur)}</td>
              <td className={`border border-slate-200 px-2 py-1 text-right font-mono font-semibold ${row.profitEur >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {row.profitEur >= 0 ? `€ ${fmt(row.profitEur)}` : `-€ ${fmt(Math.abs(row.profitEur))}`}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="border border-slate-200 px-2 py-2 text-center text-slate-400">—</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function toRows(items: { email?: string; name?: string; bets: number; turnoverEur: number; profitEur: number }[]): Row[] {
  return items.map(item => ({
    name: item.email ?? item.name ?? '',
    bets: item.bets,
    turnoverEur: item.turnoverEur,
    profitEur: item.profitEur,
  }));
}

export default function ReportView({ report }: { report: BrandReport }) {
  return (
    <article className="border border-slate-300 bg-white overflow-hidden print:border-slate-400">

      {/* Summary row */}
      <table className="w-full border-collapse text-xs">
        <tbody>
          <tr className="bg-white font-semibold text-slate-700">
            <td className="border border-slate-300 px-2 py-1.5 capitalize">{report.brandName}</td>
            <td className="border border-slate-300 px-2 py-1.5">{report.date}</td>
          </tr>
        </tbody>
      </table>

      {/* Customers */}
      <div className="flex border-t border-slate-300 divide-x divide-slate-300">
        <HalfSection label="Top Customers" nameHeader="User" rows={toRows(report.topCustomers)} side="top" />
        <HalfSection label="Bottom Customers" nameHeader="User" rows={toRows(report.bottomCustomers)} side="bottom" />
      </div>

      {/* Tournaments */}
      <div className="flex border-t border-slate-300 divide-x divide-slate-300">
        <HalfSection label="Top Tournaments" nameHeader="Tournament" rows={toRows(report.topTournaments)} side="top" />
        <HalfSection label="Bottom Tournaments" nameHeader="Tournament" rows={toRows(report.bottomTournaments)} side="bottom" />
      </div>

      {/* Events */}
      <div className="flex border-t border-slate-300 divide-x divide-slate-300">
        <HalfSection label="Top Events" nameHeader="Event" rows={toRows(report.topEvents)} side="top" />
        <HalfSection label="Bottom Events" nameHeader="Event" rows={toRows(report.bottomEvents)} side="bottom" />
      </div>

    </article>
  );
}
