import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface Deal {
  id: string;
  title: string;
  description: string;
  valid_until: string;
  images?: string[];
  is_active: boolean;
}

const getEffectiveMerchantId = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('get_current_merchant');
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return row?.id ?? row?.merchant_id ?? null;
  } catch {
    return null;
  }
};

export const createDealHandlers = (
  setEditingDeal: (deal: Deal | null) => void,
  setEditDialogOpen: (open: boolean) => void,
  setDeletingDealId: (id: string | null) => void,
  _merchantId: string | null,
  loadDeals: (id: string) => Promise<void>
) => {
  const handleEditDeal = (deal: Deal) => {
    setEditingDeal({ ...deal });
    setEditDialogOpen(true);
  };

  const handleDealUpdated = async () => {
    try {
      const merchantId = await getEffectiveMerchantId();
      if (!merchantId) throw new Error('Merchant not resolved');
      await loadDeals(merchantId);
      toast({ title: 'Success', description: 'Deal saved' });
    } catch {
      toast({
        title: 'Warning',
        description: 'Deal saved but list did not refresh.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    setDeletingDealId(dealId);

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;

      const merchantId = await getEffectiveMerchantId();
      if (merchantId) {
        await loadDeals(merchantId);
      }

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete deal',
        variant: 'destructive',
      });
      return false;
    } finally {
      setDeletingDealId(null);
    }
  };

  return {
    handleEditDeal,
    handleDealUpdated,
    handleDeleteDeal,
  };
};
