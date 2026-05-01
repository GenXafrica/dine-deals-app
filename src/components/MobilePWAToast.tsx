// src/components/MobilePWAToast.tsx

import React, { useEffect, useState } from 'react';

export const MobilePWAToast: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const isHomePage = window.location.pathname === '/';
    const isDesktopView = window.matchMedia('(min-width: 768px)').matches;

    // Already installed?
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // @ts-ignore
    const isIOSStandalone = (window.navigator as any).standalone;

    if (isStandalone || isIOSStandalone) return;

    const handleBeforeInstallPrompt = (e: any) => {
      // Desktop only: suppress the browser's default blue install button.
      if (!isDesktopView) return;

      e.preventDefault();

      if (!isHomePage) return;

      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handler = (e: any) => {
      // Keep existing mobile behaviour unchanged.
      if (!isHomePage) return;

      setDeferredPrompt(e.detail);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('dd-install-ready', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('dd-install-ready', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setCanInstall(false);
    } catch (err) {
      console.error('Install failed:', err);
    }
  };

  if (!canInstall) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <button
        onClick={handleInstall}
        className="w-full max-w-sm bg-[#16A34A] text-white py-3 rounded-lg font-semibold shadow-lg"
      >
        Install Dine Deals
      </button>
    </div>
  );
};
