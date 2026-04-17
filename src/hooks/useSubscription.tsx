import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Subscription } from '@/types';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  const pendingRefetchRef = useRef<number | null>(null);
  const hasFetchedRef = useRef(false);
  const fetchInProgressRef = useRef(false);

  const merchantIdRef = useRef<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    if (!user || hasFetchedRef.current) {
      fetchInProgressRef.current = false;
      setLoading(false);
      return;
    }

    hasFetchedRef.current = true;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;

      if (!session) {
        fetchInProgressRef.current = false;
        setLoading(false);
        return;
      }

      if (session.user?.id !== user.id) {
        setSubscription(null);
        fetchInProgressRef.current = false;
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (merchantError) throw merchantError;

      if (!merchantData) {
        merchantIdRef.current = null;
        setSubscription(null);
        setError(null);
        fetchInProgressRef.current = false;
        setLoading(false);
        return;
      }

      merchantIdRef.current = merchantData.id;

const { data: subs, error: fetchError } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('merchant_id', merchantData.id)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(1);

      if (fetchError) throw fetchError;

      const activeSub = subs?.[0] ?? null;

      if (!activeSub) {
        setSubscription(null);
        setError(null);
        return;
      }

      const activePlanId =
        activeSub.plan_id || activeSub.subscription_plan_id || null;

      let plan: any = null;

      if (activePlanId) {
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('id, name, slug, deal_limit')
          .eq('id', activePlanId)
          .maybeSingle();

        if (planError) throw planError;
        plan = planData;
      }

      const normalizedSlug = String(plan?.slug || '').toLowerCase().trim();

      const derivedTier =
        normalizedSlug === 'chef'
          ? 'Chef'
          : normalizedSlug === 'main'
          ? 'Main'
          : normalizedSlug === 'starter'
          ? 'Starter'
          : '';

      setSubscription({
        ...(activeSub as any),
        plan_id: activeSub.plan_id || activeSub.subscription_plan_id || plan?.id || null,
        subscription_plan_id:
          activeSub.subscription_plan_id || activeSub.plan_id || plan?.id || null,
        plan_slug: normalizedSlug,
        plan: plan?.name || '',
        tier: derivedTier,
        billing_cycle: String(activeSub.billing_cycle || '').toLowerCase().trim(),
        deal_limit: plan?.deal_limit ?? null,
      } as Subscription);

      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch subscription data';

      setError(errorMessage);
      setSubscription(null);
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const token = session?.access_token ?? null;

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && token) {
        if (pendingRefetchRef.current) {
          window.clearTimeout(pendingRefetchRef.current);
          pendingRefetchRef.current = null;
        }

        pendingRefetchRef.current = window.setTimeout(() => {
          hasFetchedRef.current = false;
          fetchSubscription();

          pendingRefetchRef.current = null;
        }, 150);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();

      if (pendingRefetchRef.current) {
        window.clearTimeout(pendingRefetchRef.current);
        pendingRefetchRef.current = null;
      }
    };
  }, [fetchSubscription]);

  useEffect(() => {
    if (!merchantIdRef.current) return;

    const interval = setInterval(() => {
      hasFetchedRef.current = false;
      fetchSubscription();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchSubscription]);

  const hasFeature = (feature: string): boolean => {
    if (!subscription) return feature === 'basic_deals';

    switch ((subscription as any).tier) {
      case 'Main':
        return ['basic_deals', 'multiple_deals', 'analytics'].includes(feature);

      case 'Chef':
        return [
          'basic_deals',
          'multiple_deals',
          'analytics',
          'unlimited_deals',
          'priority_support',
          'featured_listings'
        ].includes(feature);

      default:
        return feature === 'basic_deals';
    }
  };

  const canAddDeal = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (merchantError) return false;

      const merchantId = merchantData?.id ?? null;

      const { data, error } = await supabase.functions.invoke('check-deal-limits', {
        body: { userId: user.id, merchantId }
      });

      if (error) return false;

      return data?.canAddDeal || false;
    } catch {
      return false;
    }
  };

  const getDealLimit = (): string => {
    if (!subscription) return 'One Only';

    switch ((subscription as any).tier) {
      case 'Main':
        return 'Up to Three';

      case 'Chef':
        return 'Up to Five';

      default:
        return 'One Only';
    }
  };

  const refreshSubscription = async () => {
    hasFetchedRef.current = false;
    await fetchSubscription();
  };

  return {
    subscription,
    loading,
    error,
    hasFeature,
    canAddDeal,
    getDealLimit,
    refetch: refreshSubscription,
    refreshSubscription
  };
};
