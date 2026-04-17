import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePostLoginRedirect } from "@/hooks/usePostLoginRedirect";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  usePostLoginRedirect();

  const location = useLocation();
  const pathname = (location.pathname || "").toLowerCase();

  const [layoutReady, setLayoutReady] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(
    (window as any).__BOTTOM_SHEET_OPEN__ === true
  );

  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLayoutReady(true), 150);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const handler = () => {
      setIsSheetOpen((window as any).__BOTTOM_SHEET_OPEN__ === true);
    };

    window.addEventListener("dd:sheet", handler as EventListener);
    return () =>
      window.removeEventListener("dd:sheet", handler as EventListener);
  }, []);

  useEffect(() => {
    const key = "help_tooltip_first_seen_at";
    const stored = localStorage.getItem(key);

    const now = new Date().getTime();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    let shouldShow = false;

    if (!stored) {
      localStorage.setItem(key, now.toString());
    }

    const firstSeen = parseInt(localStorage.getItem(key) || now.toString(), 10);

    if (now - firstSeen <= THIRTY_DAYS) {
      shouldShow = true;
    }

    if (!shouldShow) return;

    const showTimer = setTimeout(() => {
      setShowTooltip(true);

      const hideTimer = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);

      return () => clearTimeout(hideTimer);
    }, 13000);

    return () => clearTimeout(showTimer);
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
    setShowTooltip(false);
  };

  const startYear = 2025;
  const currentYear = new Date().getFullYear();
  const yearDisplay =
    currentYear > startYear ? `${startYear}–${currentYear}` : `${startYear}`;

  const FooterCopyright = (
    <div className="text-center text-[10px] text-gray-400 pointer-events-none">
      <div>© Dine Deals {yearDisplay}</div>
      <a
        href="https://appgenx.co.za/"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto transition-colors hover:text-blue-400 active:text-blue-500"
      >
        Powered by Appgenx
      </a>
    </div>
  );

  const isDealsPage =
    pathname === "/deals" || pathname.startsWith("/deals/");

  const showGlobalFooter = pathname === "/";

  const isAdminPage = pathname.startsWith("/admin");

  const isProfilePage =
    pathname === "/customer-profile" ||
    pathname === "/merchant-profile";

  const isHomePage = pathname === "/";
  const isLoginPage =
    pathname === "/login" ||
    pathname === "/customer-login" ||
    pathname === "/merchant-login";

  const isAuthCallback = pathname === "/auth/callback";
  const isAboutPage = pathname === "/about";

  const hideHelpIcon =
    isHomePage ||
    isLoginPage ||
    isAdminPage ||
    isProfilePage ||
    isAuthCallback ||
    isAboutPage;

  const bottomPaddingClass = isDealsPage
    ? ""
    : showGlobalFooter
    ? "pb-12"
    : "";

  const layoutBgClass = isLoginPage ? "bg-black" : "bg-white";

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${layoutBgClass}`}>
      <div
        id="dd-main-scroll"
        className={`w-full min-h-screen ${layoutBgClass} ${bottomPaddingClass}`}
      >
        {children}
      </div>

      {layoutReady && showGlobalFooter && (
        <div className="fixed bottom-1 left-0 right-0 z-40">
          {FooterCopyright}
        </div>
      )}

      {!hideHelpIcon && !isSheetOpen && (
        <>
          {showTooltip && isMinimized && (
            <div className="fixed bottom-6 right-10 z-40 bg-[#16A34A] text-white text-xs px-2 py-1 rounded shadow">
              Need help?
            </div>
          )}

          <button
            onClick={handleRestore}
            className="fixed bottom-6 right-4 z-30 w-4 h-4 rounded-full bg-[#25D366] shadow-lg"
          />

          {!isMinimized && (
            <a
              href="https://wa.me/27620128252?text=Hi%20Dine%20Deals,%20I%20need%20help"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-6 right-4 z-30 w-14 h-14 rounded-xl bg-[#25D366] flex items-center justify-center shadow-xl active:scale-95 transition-transform duration-150"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-white"
                  fill="currentColor"
                >
                  <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.52 0 .2 5.32.2 11.86c0 2.09.55 4.13 1.58 5.92L0 24l6.4-1.68a11.9 11.9 0 0 0 5.66 1.44h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.24-6.15-3.41-8.42ZM12.07 21.74h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.8 1 1.01-3.7-.23-.38a9.8 9.8 0 0 1-1.5-5.22c0-5.42 4.41-9.83 9.84-9.83 2.63 0 5.11 1.02 6.96 2.88a9.78 9.78 0 0 1 2.87 6.95c0 5.42-4.41 9.84-9.83 9.84Z" />
                  <path d="M17.58 14.74c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.51-.9-.8-1.5-1.8-1.68-2.1-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.30-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.30-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.13 4.55.72.31 1.28.5 1.72.64.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
                </svg>

                <span
                  onClick={handleMinimize}
                  className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                >
                  ×
                </span>
              </div>
            </a>
          )}
        </>
      )}
    </div>
  );
}