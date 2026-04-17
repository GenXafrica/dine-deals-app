import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, User, Building2, Phone, MapPin, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Merchant, Customer } from '@/types';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  merchant?: Merchant | null;
  customer?: Customer | null;
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  onEditProfile,
  merchant,
  customer
}) => {
  const isMerchant = !!merchant;
  const isCustomer = !!customer;

  const getMissingFields = () => {
    const missing: Array<{ field: string; icon: React.ReactNode; label: string }> = [];

    if (isMerchant && merchant) {
      if (!merchant.ownerName || merchant.ownerName.trim() === '' || merchant.ownerName === 'Not specified') {
        missing.push({ field: 'ownerName', icon: <User className="w-4 h-4" />, label: 'Owner Name' });
      }
      if (!merchant.name || merchant.name.trim() === '' || merchant.name === 'Not specified') {
        missing.push({ field: 'restaurantName', icon: <Building2 className="w-4 h-4" />, label: 'Restaurant Name' });
      }
      if (!merchant.phoneNumber || merchant.phoneNumber.trim() === '' || merchant.phoneNumber === 'Not specified') {
        missing.push({ field: 'phone', icon: <Phone className="w-4 h-4" />, label: 'Phone Number' });
      }
      if (!merchant.address || merchant.address.trim() === '' || merchant.address === 'Not specified') {
        missing.push({ field: 'address', icon: <MapPin className="w-4 h-4" />, label: 'Address' });
      }
      if (!merchant.city || merchant.city.trim() === '' || merchant.city === 'Not specified') {
        missing.push({ field: 'city', icon: <MapPin className="w-4 h-4" />, label: 'City' });
      }
    }

    if (isCustomer && customer) {
      if (!customer.full_name || customer.full_name.trim() === '' || customer.full_name === 'Not specified') {
        missing.push({ field: 'fullName', icon: <User className="w-4 h-4" />, label: 'Full Name' });
      }
      if (!customer.phone || customer.phone.trim() === '' || customer.phone === 'Not specified') {
        missing.push({ field: 'phone', icon: <Phone className="w-4 h-4" />, label: 'Phone Number' });
      }
      if (!customer.city || customer.city.trim() === '' || customer.city === 'Not specified') {
        missing.push({ field: 'city', icon: <MapPin className="w-4 h-4" />, label: 'Town / City' });
      }
    }

    return missing;
  };

  const missingFields = getMissingFields();

  if (missingFields.length === 0) {
    return null;
  }

  const handleCompleteProfile = () => {
    onEditProfile();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Complete Your Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete your profile to access all features. The following fields are required:
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            {missingFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                {field.icon}
                <span className="text-sm font-medium">{field.label}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleCompleteProfile}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Complete Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};