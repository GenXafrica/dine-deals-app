// src/components/AdminLoginModal.tsx
import React, { useEffect } from "react";
import AdminLogin from "./AdminLogin";

type Props = {
  open: boolean;
  onClose: () => void;
  onLogin?: () => void;
};

const RECENT_CLOSE_KEY = "dinedeals:admin_modal_closed_at";

export default function AdminLoginModal({ open, onClose, onLogin }: Props) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const markClosed = () => {
    try {
      sessionStorage.setItem(RECENT_CLOSE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleClose = (
    e?: React.MouseEvent,
    opts?: { skipMarkClosed?: boolean }
  ) => {
    e?.stopPropagation?.();

    // Only mark "recently closed" when the user explicitly closes the modal.
    // Do NOT mark closed when a successful login closes it.
    if (!opts?.skipMarkClosed) markClosed();

    onClose(); // parent owns navigation / URL changes
  };

  const handleLogin = () => {
    // Remove logged_out=1 from the URL after login
    const url = new URL(window.location.href);
    url.searchParams.delete('logged_out');
    window.history.replaceState({}, '', url.toString());

    // Call the parent onLogin to navigate to /admin without modal
    onLogin?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 mx-4"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>

        <AdminLogin
          onLogin={() => {
            // On successful login, remove the logged_out=1 and close the modal
            handleLogin();
          }}
        />
      </div>
    </div>
  );
}
