import React from 'react';
import { useDealLimits } from '@/hooks/useDealLimits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock, Zap } from 'lucide-react';

interface DealLimitCheckerProps {
  onUpgrade: () => void;
  currentDealCount: number;
}

export const DealLimitChecker: React.FC<DealLimitCheckerProps> = ({ onUpgrade, currentDealCount }) => {
  const { getCurrentTier, getDealLimit, getCurrentPlan } = useDealLimits();
  const [tier, setTier] = React.useState('Free Starter');
  const [limit, setLimit] = React.useState(1);
  const [plan, setPlan] = React.useState<any>(null);
  
  React.useEffect(() => {
    const loadData = async () => {
      const currentTier = await getCurrentTier();
      const currentLimit = await getDealLimit();
      const currentPlan = await getCurrentPlan();
      setTier(currentTier);
      setLimit(currentLimit);
      setPlan(currentPlan);
    };
    loadData();
  }, []);
  
  const isAtLimit = currentDealCount >= limit;
  
  if (!isAtLimit) return null;
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg text-orange-800">Deal Limit Reached</CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          You've reached your {limit} deal limit for the {tier} plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div>
            <p className="font-medium">Current Plan: {tier}</p>
            <p className="text-sm text-gray-600">{limit} active deals</p>
          </div>
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            {currentDealCount}/{limit}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Upgrade for more deals:</h4>
          <div className="grid gap-2">
            {tier === 'Free Starter' && (
              <>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Main Course</span>
                  </div>
                  <span className="text-sm text-gray-600">3 deals • R750/month</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded border">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Chef's Table</span>
                  </div>
                  <span className="text-sm text-gray-600">5 deals • R125/month</span>
                </div>
              </>
            )}
            {tier === 'Main Course' && (
              <div className="flex items-center justify-between p-2 bg-purple-50 rounded border">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Chef's Table</span>
                </div>
                <span className="text-sm text-gray-600">5 deals • R125/month</span>
              </div>
            )}
          </div>
        </div>
        
        <Button onClick={onUpgrade} className="w-full" variant="default">
          <Crown className="h-4 w-4 mr-2" />
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
};

export default DealLimitChecker;