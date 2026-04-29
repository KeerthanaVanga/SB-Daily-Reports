import MonthlyReportSection from '../components/MonthlyReportSection';

export const metadata = {
  title: 'Monthly Report — Betting Report Generator',
};

export default function MonthlyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 print:hidden">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Monthly Freebet Report</h1>
              <p className="text-teal-300 text-sm mt-1">
                Upload your monthly freebet CSV to generate a grouped, aggregated bonus report.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {['Group aggregation', 'Weighted rate calculations', 'Sortable table', 'Excel export'].map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-teal-200">
                <svg className="h-3 w-3 text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                {f}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 print:p-0 print:max-w-none">
        <MonthlyReportSection />
      </main>

      <footer className="mt-16 border-t border-slate-200 print:hidden">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <p className="text-xs text-slate-400 text-center">
            Data is processed securely on the server — no files are stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
