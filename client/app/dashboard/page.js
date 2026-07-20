'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

const STATUS_COLOR = {
  completed: 'text-emerald-400', running: 'text-yellow-400',
  pending: 'text-slate-400', failed: 'text-red-400',
};

export default function DashboardPage() {
  const [data, setData] = useState({ reviews: [], total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page, limit: 10 });
      if (search) qs.set('search', search);
      if (language) qs.set('language', language);
      setData(await api(`/reviews?${qs}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, language]);

  useEffect(() => { load(1); }, [load]);

  async function remove(id) {
    if (!confirm('Delete this review?')) return;
    await api(`/reviews/${id}`, { method: 'DELETE' });
    load(data.page);
  }

  const pages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Your reviews</h1>
        <Link href="/dashboard/new" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400">
          + New review
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          placeholder="Search title or summary…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
        />
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="">All languages</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
        </select>
      </div>

      {error && <p className="text-red-400">{error}</p>}
      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : data.reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-slate-400">
          No reviews yet. Start by submitting some code.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.reviews.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-4">
              <div>
                <Link href={`/reviews/${r.id}`} className="font-medium hover:text-emerald-400">
                  {r.title}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="font-mono">{r.language}</span>
                  {' · '}
                  <span className={STATUS_COLOR[r.status]}>{r.status}</span>
                  {' · '}{new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                {r.error_count > 0 && <span className="text-orange-400">{r.error_count} errors</span>}
                {r.warning_count > 0 && <span className="text-yellow-400">{r.warning_count} warnings</span>}
                {r.overall_score != null && <span className="font-mono text-emerald-400">{r.overall_score}/100</span>}
                <button onClick={() => remove(r.id)} className="text-slate-500 hover:text-red-400">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button disabled={data.page <= 1} onClick={() => load(data.page - 1)}
            className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40">Prev</button>
          <span className="text-slate-400">{data.page} / {pages}</span>
          <button disabled={data.page >= pages} onClick={() => load(data.page + 1)}
            className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
