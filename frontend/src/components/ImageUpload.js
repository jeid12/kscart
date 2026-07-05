'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';

// Uploads an image to Cloudinary (via the backend) and calls onUploaded(url).
export default function ImageUpload({ value, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      onUploaded(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumb" src={value} alt="Item" />
        ) : (
          <div className="thumb thumb-placeholder">🛍️</div>
        )}
        <div style={{ flex: 1 }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
          </button>
          {value && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginLeft: 8, color: 'var(--danger)' }}
              onClick={() => onUploaded('')}
              disabled={uploading}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      {error && <div className="hint" style={{ color: 'var(--danger)' }}>{error}</div>}
    </div>
  );
}
