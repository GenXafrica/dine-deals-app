import React from "react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { Button } from "./ui/button";

interface PWAWrapperProps {
  children: React.ReactNode;
}

export const PWAWrapper: React.FC<PWAWrapperProps> = ({ children }) => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = React.useState(false);
  const [showInstalled, setShowInstalled] = React.useState(false);

  const isAndroid =
    typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent);

  const isDesktop = !isAndroid;

  React.useEffect(() => {
    const handleAppInstalled = () => {
      try {
        const shown = localStorage.getItem("dd_pwa_installed_toast_shown");
        if (shown === "1") return;
        localStorage.setItem("dd_pwa_installed_toast_shown", "1");
      } catch {}
      setShowInstalled(true);
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  React.useEffect(() => {
    if (!showInstalled) return;
    const timer = setTimeout(() => setShowInstalled(false), 4000);
    return () => clearTimeout(timer);
  }, [showInstalled]);

  return (
    <>
      {children}

      {/* Android only: existing install card (UNCHANGED) */}
      {isAndroid && !isInstalled && isInstallable && !dismissed && (
        <PWAInstallPrompt
          onInstall={installApp}
          onDismiss={() => setDismissed(true)}
        />
      )}

      {/* Desktop install button */}
      {isDesktop && !isInstalled && isInstallable && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button onClick={installApp}>
            Install App
          </Button>
        </div>
      )}

      {/* Installed confirmation toast */}
      {showInstalled && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[90%] max-w-sm rounded-lg bg-black text-white px-4 py-3 text-center text-sm shadow-lg">
          Dine Deals is installed on your device.
        </div>
      )}
    </>
  );
};
