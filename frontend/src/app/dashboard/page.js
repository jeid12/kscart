'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/AppBar';
import DashboardNav from '@/components/DashboardNav';
import ShareBox from '@/components/ShareBox';
import ImageUpload from '@/components/ImageUpload';
import { api } from '@/lib/api';
import { formatRWF } from '@/lib/format';
import { getToken, clearSession } from '@/lib/auth';

const EMPTY_ITEM = { name: '', price: '', photoUrl: '', available: true, categoryId: '' };

export default function DashboardPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vendor, setVendor] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [newCategory, setNewCategory] = useState('');
  const [catBusy, setCatBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [data, catData] = await Promise.all([
        api.getMyStore(),
        api.getCategories(),
      ]);
      setVendor(data.vendor);
      setItems(data.items);
      setCategories(catData.categories);
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
  }

  const categoryName = (id) =>
    categories.find((c) => c.categoryId === id)?.name || null;

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setCatBusy(true);
    try {
      await api.addCategory(newCategory.trim());
      setNewCategory('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCatBusy(false);
    }
  }

  async function renameCategory(cat) {
    const name = prompt('Rename category', cat.name);
    if (!name || !name.trim()) return;
    try {
      await api.updateCategory(cat.categoryId, name.trim());
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeCategory(cat) {
    if (!confirm(`Delete category "${cat.name}"? Items stay but become uncategorized.`)) return;
    try {
      await api.deleteCategory(cat.categoryId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setFormError('');
    setEditing({ ...EMPTY_ITEM });
  }

  function openEdit(item) {
    setFormError('');
    setEditing({
      itemId: item.itemId,
      name: item.name,
      price: String(item.price),
      photoUrl: item.photoUrl || '',
      available: item.available,
      categoryId: item.categoryId || '',
    });
  }

  async function saveItem(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        name: editing.name,
        price: Number(editing.price),
        photoUrl: editing.photoUrl || null,
        available: editing.available,
        categoryId: editing.categoryId || null,
      };
      if (editing.itemId) {
        await api.updateItem(editing.itemId, payload);
      } else {
        await api.addItem(payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable() {
    try {
      await api.updateItem(editing.itemId, { available: !editing.available });
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function removeItem() {
    if (!confirm(`Delete "${editing.name}"?`)) return;
    try {
      await api.deleteItem(editing.itemId);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  if (!ready || loading) {
    return (
      <>
        <AppBar />
        <div className="spinner">Loading your store…</div>
      </>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const storeUrl = vendor ? `${origin}/s/${vendor.storeSlug}` : '';

  return (
    <>
      <AppBar />
      <main className="container-wide page">
        <DashboardNav />
        <h1>{vendor?.businessName}</h1>
        <p className="subtitle">Manage your items and share your store.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <h2>Categories</h2>
          <form onSubmit={addCategory} className="filter-bar" style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="New category (e.g. Drinks)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button className="btn btn-sm btn-primary" type="submit" disabled={catBusy}>
              Add
            </button>
          </form>
          {categories.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              No categories yet. Create some to group your items on the storefront.
            </p>
          ) : (
            categories.map((cat) => (
              <div className="item-row" key={cat.categoryId}>
                <div className="item-meta">
                  <div className="item-name">{cat.name}</div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => renameCategory(cat)}>
                  Rename
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => removeCategory(cat)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ margin: 0 }}>Items ({items.length})</h2>
            <button className="btn btn-sm btn-primary" onClick={openAdd}>
              + Add item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty">No items yet. Add your first product to get started.</div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {items.map((item) => (
                <div className="item-row" key={item.itemId}>
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="thumb" src={item.photoUrl} alt={item.name} />
                  ) : (
                    <div className="thumb thumb-placeholder">🛍️</div>
                  )}
                  <div className="item-meta">
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">
                      {formatRWF(item.price)}{' '}
                      {categoryName(item.categoryId) && (
                        <span className="badge">{categoryName(item.categoryId)}</span>
                      )}{' '}
                      {!item.available && <span className="badge badge-off">Hidden</span>}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Share your shop</h2>
          {storeUrl && <ShareBox url={storeUrl} label="Public store link" />}
          <a className="btn btn-outline" href={storeUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
            Preview my shop
          </a>
        </div>
      </main>

      {editing && (
        <div className="overlay" onClick={() => !saving && setEditing(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{editing.itemId ? 'Edit item' : 'Add item'}</h2>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={saveItem}>
              <div className="field">
                <label>Photo</label>
                <ImageUpload
                  value={editing.photoUrl}
                  onUploaded={(url) => setEditing({ ...editing, photoUrl: url })}
                />
              </div>
              <div className="field">
                <label>Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. 1kg Tomatoes"
                  required
                />
              </div>
              <div className="field">
                <label>Price (RWF)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                  placeholder="e.g. 1500"
                  required
                />
              </div>
              <div className="field">
                <label>Category</label>
                <select
                  value={editing.categoryId || ''}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <div className="hint">Tip: add categories above to group items.</div>
                )}
              </div>
              <div className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={editing.available}
                    onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
                  />
                  Available (visible on storefront)
                </label>
              </div>

              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save item'}
              </button>

              {editing.itemId && (
                <div className="row" style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={toggleAvailable} disabled={saving}>
                    {editing.available ? 'Hide from shop' : 'Show in shop'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ color: 'var(--danger)' }}
                    onClick={removeItem}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              )}
              <button
                type="button"
                className="btn btn-outline"
                style={{ marginTop: 10 }}
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
