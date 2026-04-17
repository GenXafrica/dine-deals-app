// src/serviceWorkerRegistration.ts

export async function registerServiceWorker(): Promise<void> {
  // Only register on production hostname or allowed preview/dev hosts
  if (
    window.location.hostname !== 'app.dinedeals.co.za' &&
    !window.location.hostname.includes('deploypad.app') &&
    window.location.hostname !== 'localhost'
  ) {
    console.log('[SW] Registration skipped - not on production or allowed preview hostname');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('[SW] Registration successful:', registration.scope);

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('[SW] New service worker found, installing...');
        newWorker.addEventListener('statechange', () => {
          console.log('[SW] State changed to:', newWorker.state);
        });
      }
    });
  } catch (error) {
    console.error('[SW] Registration failed:', error);
  }
}

export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('[SW] Unregistered successfully');
    }
  } catch (error) {
    console.error('[SW] Unregistration failed:', error);
  }
}
