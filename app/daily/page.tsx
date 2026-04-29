import DailyUploadSection from '../components/DailyUploadSection';

export const metadata = {
  title: 'Daily Report — Betting Report Generator',
};

export default function DailyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-800 print:hidden">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Daily Betting Report</h1>
              <p className="text-indigo-300 text-sm mt-1">
                Upload CSV exports from your platform — one file per brand — to generate daily insights.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {['Multi-brand support', 'Top & bottom analysis', 'Customer insights', 'Tournament breakdown', 'PDF & Excel export'].map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-indigo-200">
                <svg className="h-3 w-3 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                {f}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 print:p-0 print:max-w-none">
        <DailyUploadSection />
      </main>

      <footer className="mt-16 border-t border-slate-200 print:hidden">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <p className="text-xs text-slate-400 text-center">
            Data is processed securely on the server — no files are stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
