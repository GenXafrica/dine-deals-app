// src/main.tsx

import '@/lib/supabase';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/* =========================
   SUPPRESS CHROME MINI-INFOBAR
   (Must run before React mounts)
========================= */

let deferredInstallPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // fully suppress Chrome native banner
  deferredInstallPrompt = e;
  window.dispatchEvent(
    new CustomEvent('dd-install-ready', { detail: deferredInstallPrompt })
  );
});

/* =========================
   GLOBAL ERROR HANDLERS
========================= */

window.addEventListener('error', (e) => {
  console.error('App error:', e.error || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

window.addEventListener('beforeunload', () => {
  sessionStorage.removeItem('dine_deals_session');
});

window.addEventListener('pageshow', (event) => {
  const isResetPasswordPage = window.location.pathname === '/reset-password';

  if (event.persisted && !isResetPasswordPage) {
    window.location.reload();
  }
});

/* =========================
   MANIFEST INJECTOR
========================= */

(function injectManifestRuntime() {
  try {
    const ABS = 'https://app.dinedeals.co.za/manifest.json';
    const existing = document.querySelector(
      'link[rel="manifest"], link[rel="manifest" i]'
    );
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.type = 'application/manifest+json';
    link.href = '/manifest.json';
    document.head.appendChild(link);

    fetch(link.href, { method: 'GET', cache: 'no-store' })
      .then((res) => {
        if (!res || !res.ok) {
          link.href = ABS;
          return;
        }
        const ct = res.headers.get('content-type') || '';
        if (!/json/i.test(ct)) {
          link.href = ABS;
        }
      })
      .catch(() => {
        link.href = ABS;
      });
  } catch {}
})();

/* =========================
   SERVICE WORKER
========================= */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => {
        console.log('Service worker registered');
      })
      .catch((err) => {
        console.error('Service worker registration failed:', err);
      });
  });
}

/* =========================
   MOUNT REACT
========================= */

const rootEl = document.getElementById('root');

if (!rootEl) {
  console.error('Root element not found');
} else {
  createRoot(rootEl).render(<App />);
}
