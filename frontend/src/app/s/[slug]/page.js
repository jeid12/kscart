'use client';

import { useEffect, useMemo, useState } from 'react';
import AppBar from '@/components/AppBar';
import { api } from '@/lib/api';
import { formatRWF } from '@/lib/format';

export default function StorefrontPage({ params }) {
  const { slug } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vendor, setVendor] = useState(null);
  const [items, setItems] = useState([]);

  const [cart, setCart] = useState({}); // { itemId: quantity }
  const [showCart, setShowCart] = useState(false);
  const [checkout, setCheckout] = useState(null); // result of checkout API
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getStore(slug);
        setVendor(data.vendor);
        setItems(data.items);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  function setQty(itemId, qty) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  }

  // Client-side total (SRS FR-CART-1): instant, no server round-trip.
  const { lineItems, total, count } = useMemo(() => {
    const li = [];
    let t = 0;
    let c = 0;
    for (const item of items) {
      const qty = cart[item.itemId] || 0;
      if (qty > 0) {
        const subtotal = item.price * qty;
        t += subtotal;
        c += qty;
        li.push({ ...item, quantity: qty, subtotal });
      }
    }
    return { lineItems: li, total: t, count: c };
  }, [cart, items]);

  async function placeOrder() {
    setPlacing(true);
    setError('');
    try {
      const payload = lineItems.map((li) => ({
        itemId: li.itemId,
        quantity: li.quantity,
      }));
      const res = await api.checkout(slug, payload);
      setCheckout(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <>
        <AppBar />
        <div className="spinner">Loading store…</div>
      </>
    );
  }

  if (error && !vendor) {
    return (
      <>
        <AppBar />
        <main className="container page">
          <div className="alert alert-error">{error}</div>
          <p className="muted">This store link may be incorrect or no longer available.</p>
        </main>
      </>
    );
  }

  const initial = (vendor.businessName || '?').charAt(0).toUpperCase();

  return (
    <>
      <AppBar />
      <main className="container page" style={{ paddingBottom: count > 0 ? 120 : 48 }}>
        <div className="store-hero">
          <div className="store-avatar">{initial}</div>
          <h1 style={{ marginBottom: 2 }}>{vendor.businessName}</h1>
          <p className="muted">Browse items and order in a few taps.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {items.length === 0 ? (
          <div className="empty">This store has no items yet. Please check back soon.</div>
        ) : (
          items.map((item) => {
            const qty = cart[item.itemId] || 0;
            return (
              <div className="product" key={item.itemId}>
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="product-photo" src={item.photoUrl} alt={item.name} loading="lazy" />
                ) : (
                  <div className="product-photo thumb-placeholder">🛍️</div>
                )}
                <div className="product-info">
                  <div className="product-name">{item.name}</div>
                  <div className="product-price">{formatRWF(item.price)}</div>
                </div>
                <div className="qty">
                  {qty > 0 && (
                    <>
                      <button aria-label="Decrease" onClick={() => setQty(item.itemId, qty - 1)}>−</button>
                      <span>{qty}</span>
                    </>
                  )}
                  <button aria-label="Increase" onClick={() => setQty(item.itemId, qty + 1)}>+</button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {count > 0 && (
        <div className="orderbar">
          <div className="orderbar-inner">
            <div className="total-line">
              <span className="muted">{count} item{count > 1 ? 's' : ''}</span>
              <span className="total-amount">{formatRWF(total)}</span>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCart(true)}>
              View order
            </button>
          </div>
        </div>
      )}

      {/* Order review sheet */}
      {showCart && !checkout && (
        <div className="overlay" onClick={() => setShowCart(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Your order</h2>
            <div className="stack">
              {lineItems.map((li) => (
                <div key={li.itemId} className="total-line" style={{ margin: 0 }}>
                  <span>{li.name} × {li.quantity}</span>
                  <span>{formatRWF(li.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="total-line">
              <strong>Total</strong>
              <span className="total-amount">{formatRWF(total)}</span>
            </div>
            <button className="btn btn-primary" onClick={placeOrder} disabled={placing}>
              {placing ? 'Preparing…' : 'Continue to checkout'}
            </button>
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setShowCart(false)}>
              Keep shopping
            </button>
          </div>
        </div>
      )}

      {/* Checkout hand-off sheet: WhatsApp + MoMo (SRS 3.5 & 3.6) */}
      {checkout && (
        <div className="overlay">
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Almost done</h2>
            <p className="center muted" style={{ marginTop: 0 }}>
              Order <strong>{checkout.orderRef}</strong> · {formatRWF(checkout.total)}
            </p>

            <div className="alert alert-info">
              Two quick steps: send your order on WhatsApp, then pay with MoMo.
            </div>

            <div className="stack">
              <a className="btn btn-whatsapp" href={checkout.whatsappUrl} target="_blank" rel="noreferrer">
                1. Send order on WhatsApp
              </a>
              <a className="btn btn-momo" href={checkout.momo.ussdTelLink}>
                2. Pay {formatRWF(checkout.total)} with MoMo
              </a>
            </div>

            <div className="divider" />

            {/* Fallback for devices that block wa.me / tel: USSD (SRS NFR-REL-2) */}
            <p className="muted" style={{ fontSize: 13 }}>
              If a button does not open, dial this code manually:
            </p>
            <div className="token-box mono">{checkout.momo.ussdString}</div>
            <p className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
              KasiCart does not process the payment. You pay the vendor directly
              through MTN MoMo.
            </p>

            <button
              className="btn btn-outline"
              style={{ marginTop: 14 }}
              onClick={() => {
                setCheckout(null);
                setShowCart(false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
