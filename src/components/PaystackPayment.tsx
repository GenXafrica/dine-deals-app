import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface PaystackPaymentProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'Main Course',
    name: 'Main Course',
    monthlyPrice: 75,
    annualPrice: 750,
    features: ['Up to 3 deals', 'Email/WhatsApp Support']
  },
  {
    id: "Chef's Table",
    name: "Chef's Table",
    monthlyPrice: 125,
    annualPrice: 1250,
    features: ['Up to 5 deals', 'Priority Support']
  }
];

export const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  onSuccess,
  onCancel
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [paymentWindowOpened, setPaymentWindowOpened] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadPaystackScript = () =>
    new Promise<void>((resolve) => {
      if (window.PaystackPop) return resolve();
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve();
      document.body.appendChild(script);
    });

  const handlePayment = async () => {
    if (!selectedPlan || !user?.email) return;

    setLoading(true);
    setPaymentWindowOpened(false);

    let responseData: any = null;

    try {
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', selectedPlan)
        .maybeSingle();

      if (!planData?.id) throw new Error('Subscription plan not found');

      const { data: sessionData } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke(
        'create-paystack-transaction',
        {
          headers: {
            Authorization: `Bearer ${sessionData?.session?.access_token}`
          },
          body: {
            plan_id: planData.id,
            billing_cycle: billingCycle
          }
        }
      );

      responseData = data;

      if (error) {
        toast({
          title: 'Payment init error',
          description: error.message || 'Edge function failed',
          variant: 'destructive'
        });
        return;
      }

      const action = data?.action;
      const noPaymentResponse =
        data?.downgrade_scheduled === true ||
        data?.downgrade_cancelled === true ||
        action === 'downgrade_scheduled' ||
        action === 'downgrade_cancelled' ||
        action === 'downgrade_already_scheduled' ||
        action === 'no_change' ||
        data?.pending_plan_id != null ||
        data?.pending_switch_date != null ||
        data?.message === 'downgrade_scheduled' ||
        data?.message === 'downgrade_cancelled';

      if (data?.downgrade_scheduled === true || action === 'downgrade_scheduled') {
        toast({
          title: 'Downgrade Scheduled',
          description: 'Your plan will change at the end of the current billing period.'
        });
        onSuccess?.();
        return;
      }

      if (data?.downgrade_cancelled === true || action === 'downgrade_cancelled') {
        toast({
          title: 'Downgrade Cancelled',
          description: 'Your current plan will remain active.'
        });
        onSuccess?.();
        return;
      }

      if (action === 'downgrade_already_scheduled') {
        toast({
          title: 'Downgrade Already Scheduled',
          description: 'This downgrade is already scheduled.'
        });
        onSuccess?.();
        return;
      }

      if (action === 'no_change') {
        toast({
          title: 'No Change',
          description: 'This plan is already active.'
        });
        onSuccess?.();
        return;
      }

      if (noPaymentResponse && (!data?.reference || data?.amount == null)) {
        onSuccess?.();
        return;
      }

      if (!data?.reference || data?.amount == null) {
        toast({
          title: 'Payment init error',
          description: 'Invalid payment response from server.',
          variant: 'destructive'
        });
        return;
      }

      const amountInKobo = Number(data.amount);

      await loadPaystackScript();

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: amountInKobo,
        ref: data.reference,
        currency: 'ZAR',

        callback: function () {
          handler.close();

          toast({
            title: 'Payment successful',
            description: 'Your subscription is updating...'
          });

          onSuccess?.();
        },

        onClose: function () {
          onCancel?.();

          if (!paymentWindowOpened) return;

          toast({
            title: 'Payment Cancelled',
            description: 'You closed the payment window.'
          });
        }
      });

      setPaymentWindowOpened(true);
      handler.openIframe();
    } catch (err: any) {
      if (responseData !== null) return;

      toast({
        title: 'Payment Error',
        description: err?.message || 'Unable to start payment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">Upgrade to unlock premium features</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded ${billingCycle === 'monthly' ? 'bg-white shadow' : ''}`}
          >
            Monthly
          </button>

          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded ${billingCycle === 'annual' ? 'bg-white shadow' : ''}`}
          >
            Annual
            <Badge variant="secondary" className="ml-2">Save 17%</Badge>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`cursor-pointer transition-all ${
              selectedPlan === plan.name ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedPlan(plan.name)}
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {plan.name}
                {selectedPlan === plan.name && (
                  <Check className="h-5 w-5 text-blue-500" />
                )}
              </CardTitle>

              <CardDescription>
                <span className="text-3xl font-bold">
                  R{billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                </span>
                <span className="text-gray-500">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button
          onClick={handlePayment}
          disabled={!selectedPlan || loading}
          size="lg"
          className="px-8"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          {loading ? 'Processing...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
};