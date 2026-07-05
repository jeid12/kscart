'use client';

import { useCallback, useEffect, useState } from 'react';
import AppBar from '@/components/AppBar';
import DashboardNav from '@/components/DashboardNav';
import { api } from '@/lib/api';
import { formatRWF, formatDateTime } from '@/lib/format';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { clearSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABEL = { pending: 'Pending', paid: 'Paid', cancelled: 'Cancelled' };

export default function OrdersPage() {
  const ready = useAuthGuard();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q.trim()) params.set('q', q.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api.getOrders(query);
      setOrders(data.orders);
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
  }, [status, q, router]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function setOrderStatus(order, newStatus) {
    setBusyId(order.orderId);
    try {
      await api.updateOrderStatus(order.orderId, newStatus);
      setOrders((list) =>
        list
          .map((o) => (o.orderId === order.orderId ? { ...o, status: newStatus } : o))
          // Drop it from view if it no longer matches the active filter.
          .filter((o) => !status || o.status === status)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) return <><AppBar /><div className="spinner">Loading…</div></>;

  return (
    <>
      <AppBar />
      <main className="container page">
        <DashboardNav />
        <h1>Orders</h1>
        <p className="subtitle">See who ordered what and mark payments as received.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Search buyer, ID, or ref…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <button className="btn btn-sm btn-outline" onClick={load}>Search</button>
        </div>

        <div className="seg" style={{ marginBottom: 16, display: 'flex' }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={status === f.key ? 'active' : ''}
              onClick={() => setStatus(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty">No orders yet. Share your store link to start receiving orders.</div>
        ) : (
          orders.map((o) => (
            <div className="order-card" key={o.orderId}>
              <div className="order-head">
                <div>
                  <div className="order-buyer">{o.buyerName || 'Unknown buyer'}</div>
                  <div className="order-meta">
                    {o.buyerTag} · {o.buyerLocation || 'No location'}
                  </div>
                </div>
                <span className={`badge badge-${o.status}`}>
                  {STATUS_LABEL[o.status] || o.status}
                </span>
              </div>

              <div className="order-items">
                {(o.items || []).map((li, idx) => (
                  <div key={idx}>
                    {li.name} × {li.quantity} — {formatRWF(li.subtotal)}
                  </div>
                ))}
              </div>

              <div className="total-line" style={{ marginBottom: 8 }}>
                <strong>Total</strong>
                <strong>{formatRWF(o.total)}</strong>
              </div>

              <div className="order-meta" style={{ marginBottom: 10 }}>
                {o.orderRef} · {formatDateTime(o.createdAt)}
                <br />
                💰 Paying as: <strong>{o.payerName}</strong>
              </div>

              <div className="seg" style={{ display: 'flex' }}>
                <button
                  className={o.status === 'pending' ? 'active' : ''}
                  disabled={busyId === o.orderId}
                  onClick={() => setOrderStatus(o, 'pending')}
                >
                  Pending
                </button>
                <button
                  className={o.status === 'paid' ? 'active' : ''}
                  disabled={busyId === o.orderId}
                  onClick={() => setOrderStatus(o, 'paid')}
                >
                  Paid
                </button>
                <button
                  className={o.status === 'cancelled' ? 'active' : ''}
                  disabled={busyId === o.orderId}
                  onClick={() => setOrderStatus(o, 'cancelled')}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}
