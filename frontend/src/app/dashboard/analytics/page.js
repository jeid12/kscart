'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/AppBar';
import DashboardNav from '@/components/DashboardNav';
import { api } from '@/lib/api';
import { formatRWF } from '@/lib/format';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { clearSession } from '@/lib/auth';

export default function AnalyticsPage() {
  const ready = useAuthGuard();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        if (err.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, router]);

  if (!ready || loading) {
    return <><AppBar /><div className="spinner">Loading analytics…</div></>;
  }

  if (error) {
    return (
      <>
        <AppBar />
        <main className="container-wide page">
          <DashboardNav />
          <div className="alert alert-error">{error}</div>
        </main>
      </>
    );
  }

  const { summary, trend, topItems, topBuyers } = data;
  const maxRevenue = Math.max(1, ...trend.map((t) => t.revenue));

  return (
    <>
      <AppBar />
      <main className="container-wide page">
        <DashboardNav />
        <h1>Analytics</h1>
        <p className="subtitle">Your sales at a glance.</p>

        <div className="stat-grid">
          <div className="stat">
            <div className="stat-label">Paid revenue</div>
            <div className="stat-value">{formatRWF(summary.paidRevenue)}</div>
            <div className="stat-sub">{summary.paidOrders} paid orders</div>
          </div>
          <div className="stat">
            <div className="stat-label">Awaiting payment</div>
            <div className="stat-value">{formatRWF(summary.pendingRevenue)}</div>
            <div className="stat-sub">{summary.pendingOrders} pending orders</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total orders</div>
            <div className="stat-value">{summary.totalOrders}</div>
            <div className="stat-sub">{summary.cancelledOrders} cancelled</div>
          </div>
          <div className="stat">
            <div className="stat-label">Buyers</div>
            <div className="stat-value">{summary.uniqueBuyers}</div>
            <div className="stat-sub">{summary.repeatBuyers} repeat</div>
          </div>
        </div>

        <div className="card">
          <h2>Revenue — last 7 days</h2>
          <div className="chart">
            {trend.map((t) => (
              <div className="chart-col" key={t.date}>
                <div
                  className={`chart-bar ${t.revenue === 0 ? 'empty' : ''}`}
                  style={{ height: `${(t.revenue / maxRevenue) * 100}%` }}
                  title={formatRWF(t.revenue)}
                />
                <div className="chart-label">{t.label}</div>
              </div>
            ))}
          </div>
          <p className="muted center" style={{ fontSize: 12, marginTop: 8 }}>
            Based on orders marked as Paid.
          </p>
        </div>

        <div className="card">
          <h2>Top items</h2>
          {topItems.length === 0 ? (
            <div className="empty">No sales yet.</div>
          ) : (
            topItems.map((it) => (
              <div className="rank-row" key={it.name}>
                <span>{it.name} · {it.quantity} sold</span>
                <strong>{formatRWF(it.revenue)}</strong>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2>Top buyers</h2>
          {topBuyers.length === 0 ? (
            <div className="empty">No buyers yet.</div>
          ) : (
            topBuyers.map((b) => (
              <div className="rank-row" key={b.tag}>
                <span>{b.name || 'Unknown'} · {b.tag} · {b.orders} order{b.orders > 1 ? 's' : ''}</span>
                <strong>{formatRWF(b.spent)}</strong>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
