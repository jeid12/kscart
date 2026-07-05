'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppBar from '@/components/AppBar';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    phoneNumber: '',
    momoMerchantCode: '',
    password: '',
    language: 'en',
  });
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
      const { token, vendor } = await api.register(form);
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
          <Link className="btn btn-sm btn-outline" href="/login">
            Sign in
          </Link>
        }
      />
      <main className="container page">
        <h1>Create your store</h1>
        <p className="subtitle">It takes less than 5 minutes.</p>

        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="businessName">Business name</label>
              <input
                id="businessName"
                type="text"
                placeholder="e.g. Amahoro Fresh Market"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="phone">WhatsApp phone number</label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="0788123456"
                value={form.phoneNumber}
                onChange={(e) => update('phoneNumber', e.target.value)}
                required
              />
              <div className="hint">This is also your login. Orders arrive here on WhatsApp.</div>
            </div>

            <div className="field">
              <label htmlFor="momo">MTN MoMo merchant code</label>
              <input
                id="momo"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 123456"
                value={form.momoMerchantCode}
                onChange={(e) => update('momoMerchantCode', e.target.value)}
                required
              />
              <div className="hint">Used to build the *182# payment code. We never store PINs.</div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="lang">Store language</label>
              <select
                id="lang"
                value={form.language}
                onChange={(e) => update('language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="rw">Kinyarwanda</option>
              </select>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create my store'}
            </button>
          </form>
        </div>

        <p className="center muted">
          Already have an account? <Link href="/login" style={{ color: 'var(--brand-dark)', fontWeight: 700 }}>Sign in</Link>
        </p>
      </main>
    </>
  );
}
