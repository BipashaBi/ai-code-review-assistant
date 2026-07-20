import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 font-mono text-sm tracking-widest text-emerald-400">
        static analysis + AI, two-stage review
      </p>
      <h1 className="text-4xl font-bold sm:text-5xl">AI Code Review Assistant</h1>
      <p className="mt-4 max-w-xl text-slate-400">
        Paste code or upload a file. Get linter findings, AI review, complexity
        metrics and suggested fixes in one dashboard.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/register" className="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 hover:bg-emerald-400">
          Create account
        </Link>
        <Link href="/login" className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium hover:bg-slate-900">
          Log in
        </Link>
      </div>
    </main>
  );
}
