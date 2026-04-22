(function () {
  'use strict';

  const FALLBACK_MANIFEST = 'https://app.dinedeals.co.za/manifest.json';
  const LOCAL_MANIFEST = '/manifest.json';
  const ADMIN_MANIFEST = '/manifest-admin.json';

  function log(msg) {
    console.log('[MANIFEST-INJECTOR] ' + msg);
  }

  function warn(msg) {
    console.warn('[MANIFEST-INJECTOR] ' + msg);
  }

  // If a manifest link already exists, replace it only if needed
  const existing = document.querySelector('link[rel="manifest"]');
  if (existing) {
    log('Manifest link already present: ' + existing.href);
    // If the page is /admin and the existing manifest is not the admin one, replace it.
    try {
      const isAdminPath = window.location.pathname && window.location.pathname.startsWith('/admin');
      if (isAdminPath && !existing.href.endsWith('/manifest-admin.json')) {
        existing.href = ADMIN_MANIFEST;
        log('Existing manifest replaced with admin manifest: ' + ADMIN_MANIFEST);
      }
    } catch (e) {
      warn('Error checking/replacing existing manifest: ' + (e && e.message));
    }
    return;
  }

  // Decide which manifest to inject based on current path
  const isAdminPath = window.location.pathname && window.location.pathname.startsWith('/admin');
  const chosenManifest = isAdminPath ? ADMIN_MANIFEST : LOCAL_MANIFEST;

  // Create and append manifest link
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.type = 'application/manifest+json';
  link.href = chosenManifest;
  document.head.appendChild(link);
  log('Manifest link injected: ' + chosenManifest);

  // Test fetch and fallback if needed
  fetch(chosenManifest, { method: 'HEAD', cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) {
        warn('Selected manifest fetch failed (status ' + res.status + '), switching to fallback');
        link.href = FALLBACK_MANIFEST;
        log('Fallback manifest set: ' + FALLBACK_MANIFEST);
        return;
      }
      const ct = res.headers.get('content-type') || '';
      if (!/json/i.test(ct)) {
        warn('Selected manifest wrong content-type (' + ct + '), switching to fallback');
        link.href = FALLBACK_MANIFEST;
        log('Fallback manifest set: ' + FALLBACK_MANIFEST);
        return;
      }
      log('Selected manifest validated successfully: ' + chosenManifest);
    })
    .catch(function (err) {
      warn('Selected manifest fetch error: ' + (err && err.message));
      link.href = FALLBACK_MANIFEST;
      log('Fallback manifest set: ' + FALLBACK_MANIFEST);
    });
})();
