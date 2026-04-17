import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type MerchantRow = {
  id: string;
};

export const useDealLimits = () => {

  const [dealCount, setDealCount] = useState<number>(0);
  const [dealLimit, setDealLimit] = useState<number>(0);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  const getCurrentMerchant = useCallback(async (): Promise<MerchantRow | null> => {

    const { data } = await supabase.rpc('get_current_merchant');

    if (!data) return null;

    return Array.isArray(data) ? data[0] ?? null : data;

  }, []);

  const resolveLimits = useCallback(async (mId: string) => {

    const { data } = await supabase.rpc('get_effective_deal_limit', {
      p_merchant_id: mId,
    });

    // ✅ FIX: always set a value
    setDealLimit(typeof data === 'number' ? data : 0);

    const { data: deals } = await supabase
      .from('deals')
      .select('id')
      .eq('merchant_id', mId)
      .eq('is_active', true);

    setDealCount(Array.isArray(deals) ? deals.length : 0);

  }, []);

  const init = useCallback(async () => {

    const merchant = await getCurrentMerchant();
    if (!merchant) return;

    setMerchantId(merchant.id);
    await resolveLimits(merchant.id);

  }, [getCurrentMerchant, resolveLimits]);

  useEffect(() => {
    init();
  }, [init]);

  return {
    dealCount,
    dealLimit,
    refreshLimits: async () => {
      if (merchantId) {
        await resolveLimits(merchantId);
      } else {
        await init();
      }
    },
  };

};

export default useDealLimits;