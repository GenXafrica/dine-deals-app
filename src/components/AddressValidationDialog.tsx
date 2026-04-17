import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertTriangle } from 'lucide-react';

interface AddressValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  streetAddress: string;
  googleAddress: string;
  onConfirmStreetAddress: () => void;
  onUseGoogleAddress: () => void;
}

export const AddressValidationDialog: React.FC<AddressValidationDialogProps> = ({
  isOpen,
  onClose,
  streetAddress,
  googleAddress,
  onConfirmStreetAddress,
  onUseGoogleAddress
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-label="Address validation dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Address Mismatch Detected
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              The street address and Google Maps address don't match. Please choose which address to use:
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Street Address:</span>
              </div>
              <p className="text-sm text-gray-700 ml-6">{streetAddress}</p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Google Maps Address:</span>
              </div>
              <p className="text-sm text-gray-700 ml-6">{googleAddress}</p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col space-y-2">
          <Button 
            onClick={onUseGoogleAddress}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Use Google Maps Address
          </Button>
          <Button 
            onClick={onConfirmStreetAddress}
            variant="outline"
            className="w-full"
          >
            Keep Street Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};