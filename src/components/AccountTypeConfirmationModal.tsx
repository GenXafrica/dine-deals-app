import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AccountTypeConfirmationModalProps {
  isOpen: boolean;
  accountType: 'customer' | 'merchant';
  onConfirm: () => void;
  onClose: () => void;
}

export const AccountTypeConfirmationModal: React.FC<AccountTypeConfirmationModalProps> = ({
  isOpen,
  accountType,
  onConfirm,
  onClose
}) => {
  const [confirmed, setConfirmed] = useState(false);

  const displayType = accountType === 'customer' ? 'Diner' : 'Restaurant';

  const handleConfirm = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[420px] rounded-2xl p-6"
        aria-label="Account type confirmation dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Confirm Your Account
          </DialogTitle>
        </DialogHeader>

        {/* Summary Section */}
        <div className="mt-4 border rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Account Type
            </span>
            <span className="font-medium">
              {displayType}
            </span>
          </div>
        </div>

        {/* Helper Text */}
        <p className="mt-4 text-sm text-muted-foreground">
          Please confirm your details are correct.
        </p>

        <DialogFooter className="mt-6 flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmed(false);
              onClose();
            }}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={!confirmed}
            className="w-full sm:w-auto"
          >
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
