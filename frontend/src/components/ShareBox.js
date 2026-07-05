'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

// Renders a store link with copy-to-clipboard, a QR code, and a WhatsApp
// share shortcut (SRS FR-SHARE-1..3).
export default function ShareBox({ url, label = 'Store link' }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 1 }, () => {});
    }
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked; user can still select manually
    }
  }

  const waShare = `https://wa.me/?text=${encodeURIComponent(
    `Shop with me on KasiCart: ${url}`
  )}`;

  return (
    <div>
      <label>{label}</label>
      <div className="token-box" style={{ marginBottom: 10 }}>{url}</div>
      <div className="qr-wrap">
        <canvas ref={canvasRef} />
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-outline" onClick={copy}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <a className="btn btn-whatsapp" href={waShare} target="_blank" rel="noreferrer">
          Share
        </a>
      </div>
    </div>
  );
}
