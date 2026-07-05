'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppBar from '@/components/AppBar';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phoneNumber: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, vendor } = await api.login(form);
      saveSession(token, vendor);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppBar
        right={
          <Link className="btn btn-sm btn-outline" href="/register">
            Create store
          </Link>
        }
      />
      <main className="container page">
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to manage your store.</p>

        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="0788123456"
                value={form.phoneNumber}
                onChange={(e) => update('phoneNumber', e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="center muted">
          New to KasiCart? <Link href="/register" style={{ color: 'var(--brand-dark)', fontWeight: 700 }}>Create your store</Link>
        </p>
      </main>
    </>
  );
}
