import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface DowngradeNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deactivatedDeals: string[];
  newPlanName: string;
}

export const DowngradeNotificationDialog: React.FC<DowngradeNotificationDialogProps> = ({
  open,
  onOpenChange,
  deactivatedDeals,
  newPlanName
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-label="Subscription downgrade notification dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {deactivatedDeals.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <DialogTitle>
              {deactivatedDeals.length > 0 ? 'Plan Downgraded' : 'Plan Updated'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Your subscription has been updated to {newPlanName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {deactivatedDeals.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    {deactivatedDeals.length} deal{deactivatedDeals.length > 1 ? 's were' : ' was'} deactivated:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {deactivatedDeals.map((dealTitle, index) => (
                      <li key={index} className="truncate">{dealTitle}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-orange-700 mt-2">
                    You can reactivate these deals by upgrading your plan or deactivating other deals.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {deactivatedDeals.length === 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your plan has been successfully updated. All your deals remain active.
              </AlertDescription>
            </Alert>
          )}
          
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DowngradeNotificationDialog;