import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Merchant } from '@/types';

interface UseMerchantDataProps {
  authUserId: string | null;
  initialMerchant?: Merchant | null;
}

export const useMerchantData = ({ authUserId, initialMerchant }: UseMerchantDataProps) => {
  const [merchant, setMerchant] = useState<Merchant | null>(initialMerchant || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * NEW: always trust the session user ID (authoritative)
   * authUserId passed from props may be stale or null during first mount.
   */
  const fetchMerchant = useCallback(
    async (retryCount = 0) => {
      setError(null);

      try {
        // 1) Ensure auth is ready
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user || null;

        if (!sessionUser) {
          console.log('⏳ MERCHANT FETCH: Auth not ready yet');
          // Do not clear merchant while auth/session is resolving
          return;
        }

        const sessionUserId = sessionUser.id;

        console.log('🔍 MERCHANT QUERY (fixed):', {
          table: 'merchants',
          parameters: { user_id: sessionUserId },
          retryCount,
        });

        setLoading(true);

        // 2) Query merchant using the REAL session user id
        const { data, error: fetchError } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', sessionUserId)
          .maybeSingle();

        console.log('📊 MERCHANT QUERY RESULT:', {
          data,
          error: fetchError,
        });

        if (fetchError) {
          console.error('❌ MERCHANT FETCH ERROR:', fetchError);

          // retry network conditions
          if (retryCount < 3) {
            setTimeout(() => fetchMerchant(retryCount + 1), 800);
            return;
          }

          // Do not blank merchant on transient fetch errors
          setError(fetchError.message || 'Failed to fetch merchant data');
          return;
        }

        if (data) {
          const merchantData: Merchant = {
            id: data.id || sessionUserId,
            ownerName: data.owner_name || data.manager_name || '',
            restaurantName: data.restaurant_name || data.name || '',
            email: data.email || '',
            password: 'auth_managed',
            phone: data.phone || '',
            address: data.address || data.street_address || '',
            category: data.category || '',
            website: data.web_address || data.website || '',
            logo: data.logo_url || data.logo || '',
            deals: [],
            createdAt: data.created_at || new Date().toISOString(),
          };

          setMerchant(merchantData);
          setError(null);

          console.log('✅ MERCHANT DATA SET:', merchantData);
        } else {
          console.log('⚠️ NO MERCHANT FOUND:', sessionUserId);

          // Simple retry strategy
          if (retryCount < 3) {
            setTimeout(() => fetchMerchant(retryCount + 1), 800);
            return;
          }

          // Keep dashboard rendering while merchant row is resolving
          setError('Merchant profile not found. Please complete your profile.');
        }
      } catch (err: any) {
        console.error('❌ MERCHANT FETCH FATAL ERROR:', err);
        const message = err?.message || 'Failed to load merchant';
        setError(message);
        // Do not clear merchant on fatal error
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Load on mount or when authUserId updates.
   * Even if authUserId is null at first render, the hook will fetch again automatically.
   */
  useEffect(() => {
    fetchMerchant();
  }, [authUserId, fetchMerchant]);

  const refetch = useCallback(() => {
    fetchMerchant();
  }, [fetchMerchant]);

  return {
    merchant,
    loading,
    error,
    refetch,
  };
};
