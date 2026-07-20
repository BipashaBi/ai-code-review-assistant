'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function NewReviewPage() {
  const router = useRouter();
  const [tab, setTab] = useState('paste');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      let submission;
      if (tab === 'paste') {
        if (!title || !code) throw new Error('Title and code are required');
        ({ submission } = await api('/submissions', {
          method: 'POST', body: { title, language, code },
        }));
      } else {
        if (!file) throw new Error('Choose a file first');
        const fd = new FormData();
        fd.append('file', file);
        if (title) fd.append('title', title);
        ({ submission } = await api('/submissions', { method: 'POST', formData: fd }));
      }
      const { review } = await api(`/submissions/${submission.id}/reviews`, { method: 'POST' });
      router.push(`/reviews/${review.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const tabBtn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      className={`rounded-t-lg border-b-2 px-4 py-2 text-sm ${
        tab === id ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">New review</h1>

      <div className="mb-4 border-b border-slate-800">
        {tabBtn('paste', 'Paste code')}
        {tabBtn('file', 'Upload file')}
      </div>

      <div className="space-y-4">
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-500"
          placeholder={tab === 'paste' ? 'Title (e.g. "binary search util")' : 'Title (optional — defaults to filename)'}
          value={title} onChange={(e) => setTitle(e.target.value)}
        />

        {tab === 'paste' ? (
          <>
            <select
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              value={language} onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
            <textarea
              className="h-80 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-sm outline-none focus:border-emerald-500"
              placeholder="// paste your code here"
              spellCheck={false}
              value={code} onChange={(e) => setCode(e.target.value)}
            />
          </>
        ) : (
          <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-slate-400 hover:border-emerald-500">
            <input
              type="file" className="hidden" accept=".js,.jsx,.mjs,.py"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? <span className="text-white">{file.name}</span> : 'Click to choose a .js / .py file (max 100KB)'}
          </label>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSubmit} disabled={loading}
          className="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>
    </div>
  );
}
