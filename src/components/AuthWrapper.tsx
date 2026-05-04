// src/components/AuthWrapper.tsx
import React, { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage';
import CustomerDashboard from './CustomerDashboard';
import MerchantDashboardEnhanced from './MerchantDashboardEnhanced';
import { AboutUs } from './AboutUs';
import { ShareButton } from './ShareButton';
import { SimpleInstallButton } from './SimpleInstallButton';
import { IOSInstallBanner } from './IOSInstallBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSessionAutoLogin } from '@/hooks/useSessionAutoLogin';
import { useAppContext } from '@/contexts/AppContext';
import { usePostLoginRedirect } from '@/hooks/usePostLoginRedirect';

const HOME_BG_SRC =
  "https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/home.jpg";

/* =========================
   PUBLIC HOME
   ========================= */
const PublicHomeScreen: React.FC<{
  onLoginClick: () => void;
  onAboutClick: () => void;
}> = ({ onLoginClick, onAboutClick }) => {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    const prevOverflow = body.style.overflow;

    html.style.height = '100%';
    body.style.height = '100%';
    body.style.overflow = 'hidden';

    return () => {
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
      body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <>
      <div
        className="relative overflow-hidden flex items-center justify-center p-4"
        style={{ height: '100vh' }}
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${HOME_BG_SRC})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-black/40 -z-10" />

        <div className="absolute top-4 right-4 z-20">
          <ShareButton />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/683946324043f54d19950def_1748956034363_e66992db.png"
              alt="Dine Deals Logo"
              className="mx-auto w-64 drop-shadow-lg"
            />
          </div>

          <div className="mx-4 rounded-2xl bg-white/10 backdrop-blur-sm px-5 py-6 text-center space-y-3">
            <button
              onClick={onLoginClick}
              className="w-full rounded-xl px-6 py-5 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold flex items-center justify-center gap-3 transition"
            >
              Get started <span aria-hidden>→</span>
            </button>

            <button
              onClick={onAboutClick}
              className="w-full py-3 rounded-xl text-white/90 hover:text-white underline transition"
            >
              About us
            </button>
          </div>

          <div className="text-center mt-6 px-6 text-white drop-shadow-md font-medium leading-snug">
            PREVIEW TEST - Find the best deals within 3, 5 or 10 km of your location.
          </div>
        </div>
      </div>

      {/*
      TEST OPTION A:
      Temporarily disabled to allow Chrome’s native Install button to appear.
      This block suppresses Chrome’s install UI when present.
      
      <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <SimpleInstallButton />
          <IOSInstallBanner />
        </div>
      </div>
      */}
    </>
  );
};

/* =========================
   AUTH WRAPPER
   ========================= */
export const AuthWrapper: React.FC = () => {
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';

  // 🚀 HARD EXIT — no auth logic on public routes
  if (pathname === '/' || pathname === '/login') {
    return (
      <PublicHomeScreen
        onLoginClick={() => (window.location.href = '/login')}
        onAboutClick={() => (window.location.href = '/about')}
      />
    );
  }

  usePostLoginRedirect();

  const { isAuthenticated, user, merchant, isLoading } = useAuth();
  const { isProcessing, checkAndAutoLogin } = useSessionAutoLogin();
  const { setCurrentView } = useAppContext();

  const [userType, setUserType] = useState<'customer' | 'merchant' | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) checkAndAutoLogin();
  }, [isAuthenticated, isLoading, checkAndAutoLogin]);

  useEffect(() => {
    if (isAuthenticated && user && !merchant) {
      setCurrentView('customer');
    } else if (isAuthenticated && merchant && !user) {
      setCurrentView('merchant');
    } else if (!isAuthenticated && !isLoading && !isProcessing) {
      setCurrentView('home');
    }
  }, [
    isAuthenticated,
    user,
    merchant,
    isLoading,
    isProcessing,
    setCurrentView,
  ]);

  if (isLoading || isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (showAbout) return <AboutUs onBack={() => setShowAbout(false)} />;

  if (isAuthenticated) {
    if (merchant) return <MerchantDashboardEnhanced />;
    if (user) return <CustomerDashboard />;
  }

  if (userType) {
    return (
      <LoginPage
        onBack={() => setUserType(null)}
        onSuccess={() => setUserType(null)}
        userType={userType}
      />
    );
  }

  return (
    <PublicHomeScreen
      onLoginClick={() => setUserType('customer')}
      onAboutClick={() => setShowAbout(true)}
    />
  );
};
