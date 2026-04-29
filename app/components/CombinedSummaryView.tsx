import type { BrandReport } from '../../lib/reportProcessor';
import StatCard from './ui/StatCard';

function fmt(n: number): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CombinedSummaryView({ reports }: { reports: BrandReport[] }) {
  const totalTurnover  = reports.reduce((s, r) => s + r.turnoverEur, 0);
  const totalGgr       = reports.reduce((s, r) => s + r.ggrEur, 0);
  const totalBets      = reports.reduce((s, r) => s + r.totalBets, 0);
  const totalPlayers   = reports.reduce((s, r) => s + r.players, 0);
  const combinedMargin = totalTurnover > 0 ? (totalGgr / totalTurnover) * 100 : 0;
  const combinedAvg    = totalBets > 0 ? totalTurnover / totalBets : 0;
  const isProfit       = totalGgr >= 0;

  return (
    <article className="rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white print:shadow-none">

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-base shrink-0">
            {reports.length}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">All Brands — Combined</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {reports.map(r => r.brandName).join(' · ')}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Combined Margin</p>
          <p className={`text-2xl font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {combinedMargin.toFixed(2)}%
          </p>
        </div>
      </header>

      {/* KPI stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-slate-50 border-b border-slate-200">
        <StatCard label="Turnover" value={`€${fmt(totalTurnover)}`} accent="sky" />
        <StatCard
          label="GGR"
          value={`${isProfit ? '' : '-'}€${fmt(Math.abs(totalGgr))}`}
          accent={isProfit ? 'emerald' : 'rose'}
        />
        <StatCard label="Players" value={totalPlayers.toLocaleString()} accent="indigo" />
        <StatCard label="Total Bets" value={totalBets.toLocaleString()} accent="violet" />
        <StatCard label="Avg Bet" value={`€${fmt(combinedAvg)}`} accent="amber" />
        <StatCard
          label="Margin"
          value={`${combinedMargin.toFixed(2)}%`}
          accent={isProfit ? 'emerald' : 'rose'}
        />
      </div>

      {/* Per-brand comparison table */}
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Brand Breakdown</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {['Brand', 'Date', 'Players', 'Total Bets', 'Turnover (€)', 'GGR (€)', 'Margin', 'Avg Bet (€)'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => {
                const isPos = r.ggrEur >= 0;
                return (
                  <tr key={r.brandName} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 capitalize whitespace-nowrap">{r.brandName}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2.5 text-slate-700 tabular-nums">{r.players.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-slate-700 tabular-nums">{r.totalBets.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-slate-700 tabular-nums">€{fmt(r.turnoverEur)}</td>
                    <td className={`px-3 py-2.5 font-semibold tabular-nums ${isPos ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isPos ? '' : '-'}€{fmt(Math.abs(r.ggrEur))}
                    </td>
                    <td className={`px-3 py-2.5 font-semibold tabular-nums ${isPos ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {r.margin.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 tabular-nums">€{fmt(r.avgBetEur)}</td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="bg-amber-50 border-t-2 border-amber-200">
                <td className="px-3 py-2.5 font-bold text-amber-900">TOTAL</td>
                <td className="px-3 py-2.5 text-amber-700 text-xs">{reports.length} brands</td>
                <td className="px-3 py-2.5 font-bold text-amber-900 tabular-nums">{totalPlayers.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-bold text-amber-900 tabular-nums">{totalBets.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-bold text-amber-900 tabular-nums">€{fmt(totalTurnover)}</td>
                <td className={`px-3 py-2.5 font-bold tabular-nums ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isProfit ? '' : '-'}€{fmt(Math.abs(totalGgr))}
                </td>
                <td className={`px-3 py-2.5 font-bold tabular-nums ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {combinedMargin.toFixed(2)}%
                </td>
                <td className="px-3 py-2.5 font-bold text-amber-900 tabular-nums">€{fmt(combinedAvg)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
