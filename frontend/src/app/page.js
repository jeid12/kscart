'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppBar from '@/components/AppBar';
import { getToken } from '@/lib/auth';

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, []);

  return (
    <>
      <AppBar
        right={
          loggedIn ? (
            <Link className="btn btn-sm btn-outline" href="/dashboard">
              Dashboard
            </Link>
          ) : (
            <Link className="btn btn-sm btn-outline" href="/login">
              Sign in
            </Link>
          )
        }
      />
      <main className="container page">
        <h1>Turn your WhatsApp into a shop</h1>
        <p className="subtitle">
          Create a shareable Quick-Store in minutes. Customers browse, order on
          WhatsApp, and pay with MTN MoMo — no app to install.
        </p>

        <div className="card">
          <div className="stack">
            {loggedIn ? (
              <Link className="btn btn-primary" href="/dashboard">
                Go to my dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" href="/register">
                  Create your store
                </Link>
                <Link className="btn btn-outline" href="/login">
                  I already have an account
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h2>How it works</h2>
          <ul className="feature-list">
            <li><span className="check">✓</span> Sign up and add your items with prices and photos.</li>
            <li><span className="check">✓</span> Share one link — WhatsApp, Instagram, or a QR at your stall.</li>
            <li><span className="check">✓</span> Customers send you the order on WhatsApp automatically.</li>
            <li><span className="check">✓</span> They pay you directly with MTN MoMo. No fees to KasiCart.</li>
          </ul>
        </div>
      </main>
    </>
  );
}
