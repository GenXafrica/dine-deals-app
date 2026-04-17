import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AccountTypeSelectionModalProps {
  isOpen: boolean;
  onSelect: (role: 'Customer' | 'Merchant') => void;
}

export const AccountTypeSelectionModal: React.FC<AccountTypeSelectionModalProps> = ({
  isOpen,
  onSelect,
}) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" aria-label="Account type selection dialog">
        <DialogHeader>
          <DialogTitle>Select Your Account Type</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            We need to know your account type to set up your profile correctly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => onSelect('Customer')}
              variant="outline"
              className="w-full"
            >
              Diner
            </Button>
            <Button
              onClick={() => onSelect('Merchant')}
              variant="outline"
              className="w-full"
            >
              Restaurant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
