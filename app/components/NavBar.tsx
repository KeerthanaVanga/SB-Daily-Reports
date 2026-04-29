'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/daily',   label: 'Daily Report'   },
  { href: '/monthly', label: 'Monthly Report' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-200 print:hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-1 h-12">
          <span className="text-sm font-bold text-slate-800 mr-4">Report Generator</span>
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${pathname.startsWith(href)
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
