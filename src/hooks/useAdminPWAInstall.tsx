import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const useAdminPWAInstall = () => {
  // Admin version - PWA functionality completely disabled
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false); // Always false for admin

  useEffect(() => {
    // Prevent any install prompts in admin
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Don't store the prompt or show any UI
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    // No installation allowed in admin
    return false;
  };

  const dismissPrompt = () => {
    // Nothing to dismiss in admin
  };

  return {
    isInstallable: false,
    isInstalled: false,
    showInstallPrompt: false,
    installApp,
    dismissPrompt
  };
};