import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  deal_limit: number;
  monthly_price: number; // ZAR rands
  yearly_price: number;  // ZAR rands
  features: string[];
  is_recommended: boolean;
  is_active: boolean;
  display_order: number;
  is_one_time?: boolean;
  promo_enabled?: boolean;
  promo_duration_days?: number | null;
}

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select(`
            id,
            name,
            slug,
            deal_limit,
            monthly_price,
            yearly_price,
            features,
            is_recommended,
            is_active,
            display_order,
            is_one_time,
            promo_enabled,
            promo_duration_days
          `)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        setPlans(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load subscription plans', err);
        setError('Failed to load subscription plans');
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatPrice = (amount: number) => {
    if (!amount || amount === 0) return 'Free';
    return `R${amount.toLocaleString('en-ZA')}`;
  };

  const getPlanBySlug = (slug: string) => {
    return plans.find(p => p.slug === slug);
  };

  const activePromoPlan = plans.find(
    p => p.promo_enabled === true && Number(p.promo_duration_days || 0) > 0
  ) || null;

  return {
    plans,
    loading,
    error,
    formatPrice,
    getPlanBySlug,
    activePromoPlan,
  };
};