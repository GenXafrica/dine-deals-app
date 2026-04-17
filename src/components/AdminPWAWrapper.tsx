import React, { useEffect } from 'react';
import { useAdminPWAInstall } from '@/hooks/useAdminPWAInstall';

interface AdminPWAWrapperProps {
  children: React.ReactNode;
}

export const ADMIN_LOGIN_OPEN_EVENT = 'dinedeals:openAdminLogin';
export const ADMIN_LOGIN_CLOSED_EVENT = 'dinedeals:adminLoginClosed';
const RECENT_CLOSE_KEY = 'dinedeals:admin_modal_closed_at';
const RECENT_CLOSE_WINDOW_MS = 2000;

export const AdminPWAWrapper: React.FC<AdminPWAWrapperProps> = ({ children }) => {
  const { showInstallPrompt } = useAdminPWAInstall();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      // Only auto-open if ?modal=login and it wasn't just closed moments ago
      if (params.get('modal') === 'login') {
        let allowOpen = true;
        try {
          const lastClosed = sessionStorage.getItem(RECENT_CLOSE_KEY);
          if (lastClosed && Date.now() - Number(lastClosed) < RECENT_CLOSE_WINDOW_MS) {
            allowOpen = false;
          }
        } catch {
          // ignore sessionStorage errors
        }

        if (allowOpen) {
          window.dispatchEvent(new CustomEvent(ADMIN_LOGIN_OPEN_EVENT));
        }
      }

      // When modal signals it closed, remove `modal` param and record time
      const onModalClosed = () => {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('modal');
          window.history.replaceState({}, '', url.toString());
        } catch {
          // ignore
        }
        try {
          sessionStorage.setItem(RECENT_CLOSE_KEY, String(Date.now()));
        } catch {
          // ignore
        }
      };

      window.addEventListener(ADMIN_LOGIN_CLOSED_EVENT, onModalClosed);

      return () => {
        window.removeEventListener(ADMIN_LOGIN_CLOSED_EVENT, onModalClosed);
      };
    } catch (e) {
      // Fail silently — do not affect UI
      // eslint-disable-next-line no-console
      console.error('AdminPWAWrapper: modal handling error', e);
    }
  }, []);

  return <>{children}</>;
};
