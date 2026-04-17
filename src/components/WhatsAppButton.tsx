import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface WhatsAppButtonProps {
  phoneNumber: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber,
  className = '',
  size = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const key = 'help_tooltip_first_seen_at';
    const stored = localStorage.getItem(key);

    const now = new Date().getTime();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    if (!stored) {
      localStorage.setItem(key, now.toString());
      setShowTooltip(true);
    } else {
      const firstSeen = parseInt(stored, 10);
      if (now - firstSeen <= THIRTY_DAYS) {
        setShowTooltip(true);
      }
    }

    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleWhatsAppClick = () => {
    if (!phoneNumber) return;

    const cleanedNumber = phoneNumber.replace(/\D/g, '');

    const message = encodeURIComponent(
      'Hello, I am contacting you from the Dine Deals app.'
    );

    const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${message}`;

    window.location.href = whatsappUrl;
  };

  // Collapsed state (green dot + tooltip)
  if (!isOpen) {
    return (
      <div className={`fixed bottom-20 right-4 z-50 ${className}`}>
        {showTooltip && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded shadow">
            Need help?
          </div>
        )}

        <div
          onClick={() => {
            setIsOpen(true);
            setShowTooltip(false);
          }}
          className="w-4 h-4 bg-green-600 rounded-full cursor-pointer"
        />
      </div>
    );
  }

  // Expanded state
  return (
    <div className="fixed bottom-20 right-4 flex items-center gap-2 z-50">
      <Button
        type="button"
        onClick={handleWhatsAppClick}
        className="bg-green-600 hover:bg-green-700 text-white"
        size={size}
      >
        WhatsApp
      </Button>

      <button
        onClick={() => setIsOpen(false)}
        className="text-gray-500 text-sm"
      >
        ✕
      </button>
    </div>
  );
};