import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

export const ShareButton: React.FC = () => {
  const handleShare = () => {
    const shareUrl = 'https://app.dinedeals.co.za';
    const shareText =
      'Eat well, Spend less!';

    const message = encodeURIComponent(`${shareText} ${shareUrl}`);
    const whatsappUrl = `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <Button
      onClick={handleShare}
      className="bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center gap-3 px-4 py-2 rounded-full"
      size="sm"
      variant="default"
      title="Share with friends on WhatsApp"
    >
      <span className="text-xs font-bold tracking-wide">SHARE</span>
      <div className="bg-white rounded-full p-1.5">
        <Share2 className="h-3.5 w-3.5 text-[#16A34A]" />
      </div>
    </Button>
  );
};