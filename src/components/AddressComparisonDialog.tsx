import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, MapPin, Edit3 } from 'lucide-react';

interface AddressComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  streetAddress: string;
  googleAddress: string;
  onUseGoogleAddress: () => void;
  onKeepStreetAddress: () => void;
  onEditStreetAddress: () => void;
}

export const AddressComparisonDialog: React.FC<AddressComparisonDialogProps> = ({
  isOpen,
  onClose,
  streetAddress,
  googleAddress,
  onUseGoogleAddress,
  onKeepStreetAddress,
  onEditStreetAddress
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto" aria-label="Address comparison dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Address Mismatch Detected
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              The street address and Google Maps address don't match. Please choose which address to use.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <div className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Edit3 className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">Street Address</div>
                  <div className="text-sm text-gray-900 mt-1">{streetAddress}</div>
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-700">Google Maps Address</div>
                  <div className="text-sm text-gray-900 mt-1">{googleAddress}</div>
                  <div className="text-xs text-green-600 mt-1">✓ Verified by Google Maps</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={onUseGoogleAddress}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Use Google Maps Address
          </Button>
          <Button 
            onClick={onEditStreetAddress}
            variant="outline"
            className="w-full"
          >
            Edit Street Address
          </Button>
          <Button 
            onClick={onKeepStreetAddress}
            variant="ghost"
            className="w-full text-gray-600"
          >
            Keep Current Street Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};