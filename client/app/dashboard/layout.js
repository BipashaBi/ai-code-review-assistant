'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { getToken } from '../../lib/api';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </>
  );
}
