import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, AlertTriangle } from 'lucide-react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

interface DealLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: string;
  onUpgrade: (planSlug: string, amount: number) => void;
}

export const DealLimitModal: React.FC<DealLimitModalProps> = ({
  open,
  onOpenChange,
  currentTier,
  onUpgrade
}) => {
  const { plans, formatPrice } = useSubscriptionPlans();

  const getNextPlan = () => {
    if (currentTier === 'Starter' || !currentTier) {
      return plans.find(p => p.slug === 'main_course');
    }
    if (currentTier === 'Main') {
      return plans.find(p => p.slug === 'chefs_table');
    }
    return null;
  };

  const nextPlan = getNextPlan();
  if (!nextPlan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-label="Deal limit reached notification dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <DialogTitle>Deal Limit Reached</DialogTitle>
          </div>
          <DialogDescription>
            You've reached your deal limit for the {currentTier || 'Free'} plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              {nextPlan.slug === 'chefs_table' ? (
                <Crown className="h-5 w-5 text-purple-600" />
              ) : (
                <Zap className="h-5 w-5 text-blue-600" />
              )}
              <h3 className="font-semibold text-lg">{nextPlan.name}</h3>
              {nextPlan.is_recommended && (
                <Badge variant="secondary">Recommended</Badge>
              )}
            </div>

            <div className="text-2xl font-bold text-blue-600 mb-3">
              {formatPrice(nextPlan.monthly_price_cents)}
              <span className="text-sm font-normal text-gray-600">/month</span>
            </div>

            <ul className="space-y-1 text-sm">
              {nextPlan.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                onUpgrade(nextPlan.slug, nextPlan.monthly_price_cents);
                onOpenChange(false);
              }}
              className="flex-1"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DealLimitModal;
