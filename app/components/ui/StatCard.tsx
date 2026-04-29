interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent: 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet';
}

const accentMap: Record<StatCardProps['accent'], { bg: string; border: string; label: string; value: string }> = {
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  label: 'text-indigo-500',  value: 'text-indigo-800' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'text-emerald-600', value: 'text-emerald-800' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    label: 'text-rose-500',    value: 'text-rose-800' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'text-amber-600',   value: 'text-amber-800' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     label: 'text-sky-500',     value: 'text-sky-800' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  label: 'text-violet-500',  value: 'text-violet-800' },
};

export default function StatCard({ label, value, sub, accent }: StatCardProps) {
  const c = accentMap[accent];
  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} px-4 py-3 flex flex-col gap-0.5 min-w-0`}>
      <span className={`text-xs font-semibold uppercase tracking-wider ${c.label}`}>{label}</span>
      <span className={`text-xl font-bold font-mono truncate ${c.value}`}>{value}</span>
      {sub && <span className="text-xs text-slate-400 truncate">{sub}</span>}
    </div>
  );
}
