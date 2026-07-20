'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import SeverityBadge from '../../../components/SeverityBadge';
import { api } from '../../../lib/api';

const POLL_MS = 2500;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

export default function ReviewPage() {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('all');
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let timer;
    let cancelled = false;

    async function poll() {
      try {
        const { review: r } = await api(`/reviews/${id}`);
        if (cancelled) return;
        setReview(r);
        const done = r.status === 'completed' || r.status === 'failed';
        const timedOut = Date.now() - startedAt.current > POLL_TIMEOUT_MS;
        if (!done && !timedOut) timer = setTimeout(poll, POLL_MS);
        if (timedOut && !done) setError('Review is taking longer than expected. Refresh to check again.');
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);

  const findings = (review?.findings || []).filter(f => stage === 'all' || f.stage === stage);
  const flaggedLines = new Set((review?.findings || []).map(f => f.line_number).filter(Boolean));

  const [docs, setDocs] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');

  async function handleGenerateDocs() {
    setDocsError('');
    setDocsLoading(true);
    try {
      const data = await api(`/reviews/${id}/docs`, { method: 'POST' });
      setDocs(data.generated_docs);
    } catch (err) {
      setDocsError(err.message);
    } finally {
      setDocsLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && <p className="mb-4 text-red-400">{error}</p>}
        {!review ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{review.submission.title}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="font-mono">{review.submission.language}</span>
                  {' · '}{new Date(review.created_at).toLocaleString()}
                </p>
              </div>
              {review.overall_score != null && (
                <div className="rounded-xl border border-slate-800 px-5 py-3 text-center">
                  <p className="text-3xl font-bold text-emerald-400">{review.overall_score}</p>
                  <p className="text-xs text-slate-500">/ 100</p>
                </div>
              )}
            </div>

            {(review.status === 'pending' || review.status === 'running') && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-yellow-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
                Review in progress ({review.status})… this page updates automatically.
              </div>
            )}
            {review.status === 'failed' && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
                Review failed: {review.error_message || 'unknown error'}
              </div>
            )}

            {review.summary && (
              <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Summary</h2>
                <p className="text-slate-200">{review.summary}</p>
              </section>
            )}

            {review.metrics && (
              <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(review.metrics).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{k.replace(/_/g, ' ')}</p>
                    <p className="mt-1 font-mono text-xl">{String(v)}</p>
                  </div>
                ))}
              </section>
            )}

            <section className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Findings</h2>
                {['all', 'static', 'ai'].map((s) => (
                  <button
                    key={s} onClick={() => setStage(s)}
                    className={`rounded px-2 py-0.5 font-mono text-xs ${
                      stage === s ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {findings.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {review.status === 'completed' ? 'No findings for this filter.' : 'Findings will appear when the review completes.'}
                </p>
              ) : (
                <ul className="space-y-3">
                  {findings.map((f) => (
                    <li key={f.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        {f.line_number != null && (
                          <span className="font-mono text-xs text-slate-500">L{f.line_number}</span>
                        )}
                        {f.rule && <span className="font-mono text-xs text-slate-500">{f.rule}</span>}
                        <span className="font-mono text-xs text-slate-600">[{f.stage}]</span>
                      </div>
                      <p className="mt-2 font-medium">{f.issue}</p>
                      {f.explanation && <p className="mt-1 text-sm text-slate-400">{f.explanation}</p>}
                      {f.suggested_fix && (
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-emerald-300">
{f.suggested_fix}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Documentation</h2>
                {review.status === 'completed' && (
                  <button
                    onClick={handleGenerateDocs}
                    disabled={docsLoading}
                    className="rounded border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    {docsLoading ? 'Generating…' : 'Generate docs'}
                  </button>
                )}
              </div>
              {docsError && <p className="text-sm text-red-400">{docsError}</p>}
              {(docs || review.generated_docs) ? (
                <pre className="max-h-96 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-100">
{docs || review.generated_docs}
                </pre>
              ) : (
                !docsError && <p className="text-sm text-slate-500">AI-generated docstrings for this code. Click Generate docs to create them.</p>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Submitted code</h2>
              <div className="max-h-96 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed">
                {review.submission.code.split('\n').map((line, i) => {
                  const flagged = flaggedLines.has(i + 1);
                  return (
                    <div key={i} className={`flex ${flagged ? 'bg-yellow-500/10' : ''}`}>
                      <span className={`mr-4 w-8 shrink-0 select-none text-right ${flagged ? 'text-yellow-400' : 'text-slate-600'}`}>
                        {i + 1}
                      </span>
                      <span className="whitespace-pre">{line || ' '}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
