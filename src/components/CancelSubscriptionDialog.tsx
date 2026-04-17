import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  onCancel: () => void;
}

export const CancelSubscriptionDialog: React.FC<CancelSubscriptionDialogProps> = ({
  open,
  onOpenChange,
  subscriptionId,
  onCancel
}) => {
  const [cancelling, setCancelling] = useState(false);
  const { user } = useAuth();

  const handleCancel = async () => {
    if (!user) return;
    
    setCancelling(true);

    try {

      // ✅ Get current subscription to read paid_until
      const { data: subs, error: fetchError } = await supabase
        .from('subscriptions')
        .select('paid_until')
        .eq('id', subscriptionId)
        .maybeSingle();

      if (fetchError || !subs?.paid_until) {
        console.error('Error fetching subscription or missing paid_until:', fetchError);
        return;
      }

      // ✅ Correct cancel logic (schedule end, do NOT downgrade immediately)
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'active', // keep active until expiry
          pending_plan_id: null, // clear any downgrade
          pending_switch_date: subs.paid_until // schedule end of subscription
        })
        .eq('id', subscriptionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error cancelling subscription:', error);
        return;
      }

      onCancel();
      onOpenChange(false);

    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-label="Cancel subscription confirmation dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your subscription? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            After cancellation, you'll lose access to premium features but can continue using the free plan.
            Your subscription will remain active until the end of your current billing period.
          </AlertDescription>
        </Alert>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelling}
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};