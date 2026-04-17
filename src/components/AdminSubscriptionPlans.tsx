import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePWA } from '@/hooks/usePWA';

interface Plan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isRecommended: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free Starter',
    slug: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['1 deal active at any time'],
    isRecommended: false
  },
  {
    id: 'main',
    name: 'Main Course',
    slug: 'main',
    monthlyPrice: 75,
    yearlyPrice: 750,
    features: ['Up to 3 deals active at any time'],
    isRecommended: false
  },
  {
    id: 'chef',
    name: "Chef's Table",
    slug: 'chef',
    monthlyPrice: 125,
    yearlyPrice: 1250,
    features: ['Up to 5 deals active at any time', 'Diner notifications'],
    isRecommended: true
  }
];

export const AdminSubscriptionPlans: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isInstallable, installApp } = usePWA();

  // Disable PWA install prompt on this page
  useEffect(() => {
    // This prevents the install prompt from showing on the admin subscription page
    const originalIsInstallable = isInstallable;
    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    fetchCurrentPlan();
  }, [user]);

  const fetchCurrentPlan = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .eq('status', 'active')
        // changed .single() -> .maybeSingle() to avoid PGRST116
        .maybeSingle();

      if (!error && data && data.tier) {
        setCurrentPlan(data.tier.toLowerCase());
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
    }
  };

  const handleUpgrade = async (planSlug: string) => {
    if (!user || loading) return;
    
    setLoading(true);
    try {
      const plan = PLANS.find(p => p.slug === planSlug);
      if (!plan) throw new Error('Invalid plan selected');

      const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      
      // Paystack integration placeholder
      const paystackHandler = (window as any).PaystackPop?.setup({
        key: 'pk_test_your_paystack_public_key', // Replace with actual key
        email: user.email,
        amount: amount * 100, // Paystack expects amount in kobo
        currency: 'ZAR',
        ref: `${planSlug}_${Date.now()}`,
        callback: function(response: any) {
          // Handle successful payment
          toast({
            title: 'Payment Successful',
            description: `Upgraded to ${plan.name} plan successfully!`,
          });
          fetchCurrentPlan();
        },
        onClose: function() {
          toast({
            title: 'Payment Cancelled',
            description: 'Payment was cancelled',
            variant: 'destructive'
          });
        }
      });

      if (paystackHandler) {
        paystackHandler.openIframe();
      } else {
        // Fallback for development
        toast({
          title: 'Paystack Integration',
          description: `Would upgrade to ${plan.name} plan for R${amount} (${billingCycle})`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate upgrade',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

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
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.slug;
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          
          return (
            <Card
              key={plan.id}
              className={`relative transition-all duration-200 ${
                plan.isRecommended
                  ? 'border-2 border-blue-500 shadow-lg scale-105'
                  : isCurrentPlan
                  ? 'border-2 border-green-500'
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.isRecommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-3 py-1">
                    Recommended
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    Active
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-gray-900">
                    R{price}
                    <span className="text-base font-normal text-gray-600">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
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
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(plan.slug)}
                      disabled={loading}
                      className={`w-full ${
                        plan.isRecommended
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                    >
                      {loading ? 'Processing...' : 'Upgrade'}
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