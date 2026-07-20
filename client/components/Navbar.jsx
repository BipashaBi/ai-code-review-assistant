'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getUser } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = typeof window !== 'undefined' ? getUser() : null;

  const link = (href, label) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm ${
        pathname === href ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-mono font-bold text-emerald-400">ACRA</Link>
          {link('/dashboard', 'Reviews')}
          {link('/dashboard/new', 'New review')}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user && <span className="hidden text-slate-400 sm:inline">{user.name}</span>}
          <button
            onClick={() => { clearSession(); router.push('/login'); }}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-900"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
