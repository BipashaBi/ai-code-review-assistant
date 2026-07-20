'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setSession } from '../lib/api';

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const path = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister ? form : { email: form.email, password: form.password };
      const data = await api(path, { method: 'POST', body });
      setSession(data.token, data.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const input =
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-500';

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-bold">{isRegister ? 'Create account' : 'Log in'}</h1>
      <div className="space-y-4">
        {isRegister && (
          <input className={input} placeholder="Name" value={form.name} onChange={set('name')} />
        )}
        <input className={input} type="email" placeholder="Email" value={form.email} onChange={set('email')} />
        <input
          className={input} type="password" placeholder="Password (min 8 chars)"
          value={form.password} onChange={set('password')}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={handleSubmit} disabled={loading}
          className="w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-400">
        {isRegister ? 'Already have an account? ' : 'New here? '}
        <Link className="text-emerald-400 hover:underline" href={isRegister ? '/login' : '/register'}>
          {isRegister ? 'Log in' : 'Create one'}
        </Link>
      </p>
    </main>
  );
}
