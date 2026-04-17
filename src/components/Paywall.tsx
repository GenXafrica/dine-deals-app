// src/components/Paywall.tsx
import React from 'react';

type Props = {
  merchantId?: string;
  children?: React.ReactNode;
};

/**
 * Paywall modal (mobile-first)
 *
 * Changes: reduced card height, narrower max-width, stronger gaps so dashboard
 * is visible on top/left/right/bottom. Inner area scrolls if content is too tall.
 * No text, color, or layout elements changed beyond sizing/scroll behavior.
 */
const Paywall: React.FC<Props> = ({ merchantId, children }) => {
  const content = children ?? (
    <div className="w-full">
      <div className="flex items-center justify-center mb-4">
        <div className="rounded-full bg-amber-100 p-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 17v1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="7" y="10" width="10" height="7" rx="2" stroke="#f59e0b" strokeWidth="1.5"/>
            <path d="M9 10V8a3 3 0 1 1 6 0v2" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <h3 className="text-center text-lg font-semibold mb-2">Choose Your Plan</h3>
      <p className="text-center text-sm text-gray-500 mb-6">Upgrade to unlock premium features for your restaurant.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Main Course</div>
              <div className="mt-1 text-xl font-bold">$5/month</div>
            </div>
            <div className="text-right text-xs text-gray-400">Or $47/year</div>
          </div>
          <ul className="mt-3 text-sm text-gray-600 space-y-1">
            <li>- Up to 3 deals</li>
            <li>- Email/WhatsApp Support</li>
          </ul>
          <div className="mt-4">
            <button className="w-full rounded-md px-4 py-2 bg-blue-600 text-white">Create Subscription</button>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Chef's Table</div>
              <div className="mt-1 text-xl font-bold">$7/month</div>
            </div>
            <div className="text-right text-xs text-gray-400">Or $57/year</div>
          </div>
          <ul className="mt-3 text-sm text-gray-600 space-y-1">
            <li>- Up to 5 deals</li>
            <li>- Email/WhatsApp Support</li>
          </ul>
          <div className="mt-4">
            <button className="w-full rounded-md px-4 py-2 bg-blue-600 text-white">Create Subscription</button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <button className="w-full rounded-md px-4 py-3 bg-emerald-600 text-white">Maybe Later</button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button className="flex-1 rounded-md px-4 py-2 bg-green-600 text-white">Edit Profile</button>
        <button className="flex-1 rounded-md px-4 py-2 bg-red-600 text-white">Sign out</button>

      </div>
    </div>
  );

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 paywall-modal"
    >
      {/* Scoped CSS: remove hover/focus underline/blue line inside this modal only */}
      <style>{`
        .paywall-modal, .paywall-modal * { -webkit-tap-highlight-color: transparent; }

        .paywall-modal *:hover,
        .paywall-modal *:focus,
        .paywall-modal *:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border-color: transparent !important;
          border-bottom-color: transparent !important;
          text-decoration: none !important;
          text-decoration-color: transparent !important;
        }

        .paywall-modal h3,
        .paywall-modal h3::before,
        .paywall-modal h3::after {
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Narrower card, larger overall gaps to reveal dashboard behind */}
      <div
        className="w-full max-w-2xl mx-auto rounded-2xl bg-white shadow-2xl"
        style={{
          // Increase the visible gap around the card:
          // - larger vertical gap so dashboard shows above/below
          // - larger horizontal gap so left/right dashboard is visible
          maxHeight: 'calc(100vh - 12rem)', // bigger gap than before
        }}
      >
        {/* Inner scrolling area */}
        <div
          className="overflow-auto p-6"
          style={{
            maxHeight: 'calc(100vh - 12rem - 48px)', // leave room for card padding/border
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};

export default Paywall;
