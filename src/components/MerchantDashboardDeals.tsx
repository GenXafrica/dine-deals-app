import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createDealHandlers } from './MerchantDashboardDealsHandlers';
import { Merchant } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { MerchantDashboardDealsRender } from './MerchantDashboardDealsRender';

interface MerchantDashboardDealsProps {
  merchant: Merchant | null;
}

interface Deal {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  deal_number?: number;
  price?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  image?: string | null;
  images?: string[] | null;
  repeat?: any;
}

export const MerchantDashboardDeals = forwardRef<
  { refresh: () => void },
  MerchantDashboardDealsProps
>(({ merchant }, ref) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [addingDeal, setAddingDeal] = useState(false);

  const [dealLimit, setDealLimit] = useState<number | null>(null);

  const hasLoadedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    refresh: () => {
      loadDealLimit();
    },
  }));

  const resolveMerchantId = async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return null;

    const { data, error } = await supabase.rpc('get_current_merchant');
    if (error) return null;

    const row = Array.isArray(data) ? data[0] : data;
    return row?.id ?? row?.merchant_id ?? null;
  };

  const loadDeals = async (merchantId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          description,
          is_active,
          deal_number,
          price,
          starts_at,
          ends_at,
          image,
          images,
          repeat
        `)
        .eq('merchant_id', merchantId)
        .order('deal_number', { ascending: false });

      if (error) throw error;
      setDeals((data as Deal[]) || []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load deals.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDealLimit = async () => {
    const merchantId = await resolveMerchantId();
    if (!merchantId) return;

    const { data } = await supabase.rpc('get_effective_deal_limit', {
      p_merchant_id: merchantId,
    });

    setDealLimit(typeof data === 'number' ? data : 0);
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (hasLoadedRef.current) return;

      const merchantId = await resolveMerchantId();
      if (!merchantId || cancelled) return;

      hasLoadedRef.current = true;

      await Promise.all([
        loadDeals(merchantId),
        loadDealLimit()
      ]);
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const { handleEditDeal, handleDealUpdated, handleDeleteDeal } = createDealHandlers(
    setEditingDeal,
    setEditDialogOpen,
    setDeletingDealId,
    null,
    loadDeals
  );

  if (dealLimit === null) return null;

  return (
    <MerchantDashboardDealsRender
      deals={deals}
      dealLimit={dealLimit}
      addingDeal={addingDeal}
      setAddingDeal={setAddingDeal}
      handleEditDeal={handleEditDeal}
      handleDeleteDeal={handleDeleteDeal}
      loading={loading}
      deletingDealId={deletingDealId}
      editingDeal={editingDeal}
      editDialogOpen={editDialogOpen}
      setEditDialogOpen={setEditDialogOpen}
      handleDealUpdated={handleDealUpdated}
    />
  );
});

export default MerchantDashboardDeals;
