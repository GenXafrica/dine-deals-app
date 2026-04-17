// src/pages/deals/[dealId].tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import ExpandedDealView from '@/components/ExpandedDealView';
import { SimpleInstallButton } from '@/components/SimpleInstallButton';

export default function DealDetail() {
  const { dealId } = useParams();

  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeal = async () => {
      if (!dealId) return;

      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          merchants (*)
        `)
        .eq('id', dealId)
        .single();

      if (!error) {
        setDeal(data);
      }

      setLoading(false);
    };

    fetchDeal();
  }, [dealId]);

  if (loading) {
    return (
      <AppLayout>
        <p>Loading deal...</p>
      </AppLayout>
    );
  }

  if (!deal) {
    return (
      <AppLayout>
        <p>Deal not found</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Hide WhatsApp float + ALL action buttons ONLY on this page */}
      <style>
        {`
          .whatsapp-float,
          .floating-whatsapp,
          a[href*="wa.me"],
          a[href^="tel:"],
          a[href*="maps"],
          button[aria-label="Open in maps"] {
            display: none !important;
          }
        `}
      </style>

<ExpandedDealView
  deal={deal}
  onClose={() => window.history.back()}
  hideActions={true}
/>

      {/* Install App prompt */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 3000
        }}
      >
        <SimpleInstallButton />
      </div>
    </AppLayout>
  );
}