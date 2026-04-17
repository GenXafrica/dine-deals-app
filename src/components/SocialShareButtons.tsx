import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SocialShareButtonsProps {
  deal: {
    id: string;
    title: string;
    description: string;
    merchants?: {
      restaurant_name?: string;
    };
  };
  customerId?: string;
  onShare?: (platform: string, referralCode: string) => void;
}

export const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ 
  deal, 
  customerId,
  onShare 
}) => {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const trackShare = async (platform: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('track-deal-share', {
        body: { 
          dealId: deal.id, 
          customerId: customerId || null, 
          platform 
        }
      });

      if (error) throw error;
      
      if (onShare && data?.referralCode) {
        onShare(platform, data.referralCode);
      }
      
      return data?.referralCode || null;
    } catch (error) {
      console.error('Error tracking share:', error);
      return null;
    }
  };

  const generateShareUrl = (referralCode?: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/deals?dealId=${deal.id}`;
    return referralCode ? `${url}&ref=${referralCode}` : url;
  };

  const shareText = `Check out this deal: ${deal.title} at ${deal.merchants?.restaurant_name || 'this merchant'}!`;

  const handleWhatsAppShare = async () => {
    setIsSharing(true);
    const referralCode = await trackShare('whatsapp');
    const url = generateShareUrl(referralCode || undefined);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;
    window.open(whatsappUrl, '_blank');
    setIsSharing(false);
    toast.success('Opening WhatsApp...');
  };

  const handleFacebookShare = async () => {
    setIsSharing(true);
    const referralCode = await trackShare('facebook');
    const url = generateShareUrl(referralCode || undefined);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setIsSharing(false);
    toast.success('Opening Facebook...');
  };

  const handleTwitterShare = async () => {
    setIsSharing(true);
    const referralCode = await trackShare('twitter');
    const url = generateShareUrl(referralCode || undefined);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setIsSharing(false);
    toast.success('Opening Twitter...');
  };

  const handleEmailShare = async () => {
    setIsSharing(true);
    const referralCode = await trackShare('email');
    const url = generateShareUrl(referralCode || undefined);
    const subject = encodeURIComponent(`Check out this deal: ${deal.title}`);
    const body = encodeURIComponent(`${shareText}\n\n${deal.description}\n\nView deal: ${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setIsSharing(false);
    toast.success('Opening email client...');
  };

  const handleCopyLink = async () => {
    setIsSharing(true);
    const referralCode = await trackShare('copy_link');
    const url = generateShareUrl(referralCode || undefined);
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
    setIsSharing(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={handleWhatsAppShare}
        disabled={isSharing}
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <Share2 className="w-4 h-4 mr-1" />
        WhatsApp
      </Button>
      <Button
        onClick={handleFacebookShare}
        disabled={isSharing}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Share2 className="w-4 h-4 mr-1" />
        Facebook
      </Button>
      <Button
        onClick={handleTwitterShare}
        disabled={isSharing}
        size="sm"
        className="bg-sky-500 hover:bg-sky-600 text-white"
      >
        <Share2 className="w-4 h-4 mr-1" />
        Twitter
      </Button>
      <Button
        onClick={handleEmailShare}
        disabled={isSharing}
        size="sm"
        variant="outline"
      >
        <Share2 className="w-4 h-4 mr-1" />
        Email
      </Button>
      <Button
        onClick={handleCopyLink}
        disabled={isSharing}
        size="sm"
        variant="outline"
      >
        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
        {copied ? 'Copied!' : 'Copy Link'}
      </Button>
    </div>
  );
};