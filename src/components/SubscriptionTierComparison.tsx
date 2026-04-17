import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  deal_limit: number;
  monthly_price_cents: number;
  yearly_price_cents: number;
  features: string[];
  is_recommended: boolean;
  is_active: boolean;
  display_order: number;
}

interface SubscriptionTierComparisonProps {
  currentPlan?: string;
  onSelectPlan?: (planSlug: string, billingCycle: 'monthly' | 'yearly') => void;
}

export const SubscriptionTierComparison: React.FC<SubscriptionTierComparisonProps> = ({
  currentPlan = 'free',
  onSelectPlan
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription plans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'R0';
    return `R${(cents / 100).toFixed(0)}`;
  };

  const getYearlySavings = (monthly: number, yearly: number) => {
    if (monthly === 0 || yearly === 0) return 0;
    const monthlyCost = monthly * 12;
    const savings = ((monthlyCost - yearly) / monthlyCost) * 100;
    return Math.round(savings);
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'chef': return <Crown className="h-5 w-5" />;
      case 'main': return <Zap className="h-5 w-5" />;
      default: return null;
    }
  };

  const handleSelectPlan = (planSlug: string) => {
    if (onSelectPlan) {
      onSelectPlan(planSlug, billingCycle);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-32 bg-gray-100" />
            <CardContent className="h-48 bg-gray-50" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg flex">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <span className="ml-1 text-xs text-green-600 font-semibold">
              (Save up to 17%)
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.slug;
          const price = billingCycle === 'yearly' ? plan.yearly_price_cents : plan.monthly_price_cents;
          const savings = getYearlySavings(plan.monthly_price_cents, plan.yearly_price_cents);
          
          return (
            <Card
              key={plan.id}
              className={`relative transition-all duration-200 ${
                plan.is_recommended
                  ? 'border-2 border-blue-500 shadow-lg scale-105'
                  : isCurrentPlan
                  ? 'border-2 border-green-500'
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.is_recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-3 py-1">
                    Recommended
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {getPlanIcon(plan.slug)}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(price)}
                    <span className="text-base font-normal text-gray-600">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  
                  {billingCycle === 'yearly' && savings > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      Save {savings}% with yearly billing
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button disabled className="w-full" variant="outline">
                      Current Plan
                    </Button>
                  ) : plan.slug === 'free' ? (
                    <Button disabled className="w-full" variant="outline">
                      Free Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSelectPlan(plan.slug)}
                      className={`w-full ${
                        plan.is_recommended
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                    >
                      {currentPlan === 'free' ? 'Upgrade Now' : 'Switch Plan'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};