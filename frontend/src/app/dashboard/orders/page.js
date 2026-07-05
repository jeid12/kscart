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
const FULFILLMENT_STEPS = [
  { key: 'new', label: 'New' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

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

  async function patchOrder(order, patch) {
    setBusyId(order.orderId);
    try {
      const { order: updated } = await api.updateOrder(order.orderId, patch);
      setOrders((list) =>
        list
          .map((o) => (o.orderId === order.orderId ? updated : o))
          // Drop it from view if a payment-status change no longer matches the filter.
          .filter((o) => !status || o.status === status)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function saveNote(order) {
    const note = prompt('Add a note for this order', order.note || '');
    if (note === null) return;
    await patchOrder(order, { note });
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

              {o.note && (
                <div className="alert alert-info" style={{ fontSize: 13 }}>
                  📝 {o.note}
                </div>
              )}

              <div className="order-label">Payment</div>
              <div className="seg" style={{ display: 'flex' }}>
                <button
                  className={o.status === 'pending' ? 'active' : ''}
                  disabled={busyId === o.orderId}
                  onClick={() => patchOrder(o, { status: 'pending' })}
                >
                  Pending
                </button>
                <button
                  className={o.status === 'paid' ? 'active' : ''}
                  disabled={busyId === o.orderId}
                  onClick={() => patchOrder(o, { status: 'paid' })}
                >
                  Paid
                </button>
                <button
                  className={o.status === 'cancelled' ? 'active' : ''}
                  disabled={busyId === o.orderId}
                  onClick={() => patchOrder(o, { status: 'cancelled' })}
                >
                  Cancel
                </button>
              </div>

              <div className="order-label" style={{ marginTop: 10 }}>Fulfillment</div>
              <div className="seg" style={{ display: 'flex', flexWrap: 'wrap' }}>
                {FULFILLMENT_STEPS.map((s) => (
                  <button
                    key={s.key}
                    className={(o.fulfillment || 'new') === s.key ? 'active' : ''}
                    disabled={busyId === o.orderId}
                    onClick={() => patchOrder(o, { fulfillment: s.key })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-sm btn-outline"
                style={{ marginTop: 10 }}
                disabled={busyId === o.orderId}
                onClick={() => saveNote(o)}
              >
                {o.note ? 'Edit note' : 'Add note'}
              </button>
            </div>
          ))
        )}
      </main>
    </>
  );
}
