import React from 'react';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { Merchant, Customer } from '@/types';

interface ProfileCompletionBannerProps {
  merchant?: Merchant | null;
  customer?: Customer | null;
  onComplete: () => void;
  onDismiss: () => void;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  merchant,
  customer,
  onComplete,
  onDismiss
}) => {
  const isMerchant = !!merchant;
  const missingFields = [];

  if (isMerchant && merchant) {
    if (!merchant.ownerName && !merchant.manager_name || 
        (merchant.ownerName && (merchant.ownerName.trim() === '' || merchant.ownerName === 'Not specified')) ||
        (merchant.manager_name && (merchant.manager_name.trim() === '' || merchant.manager_name === 'Not specified'))) {
      missingFields.push('Manager\'s Name');
    }
    if (!merchant.restaurantName && !merchant.restaurant_name && !merchant.name || 
        (merchant.restaurantName && (merchant.restaurantName.trim() === '' || merchant.restaurantName === 'Not specified')) ||
        (merchant.restaurant_name && (merchant.restaurant_name.trim() === '' || merchant.restaurant_name === 'Not specified')) ||
        (merchant.name && (merchant.name.trim() === '' || merchant.name === 'Not specified'))) {
      missingFields.push('Restaurant Name');
    }
    if (!merchant.phone && !merchant.phoneNumber || 
        (merchant.phone && (merchant.phone.trim() === '' || merchant.phone === 'Not specified')) ||
        (merchant.phoneNumber && (merchant.phoneNumber.trim() === '' || merchant.phoneNumber === 'Not specified'))) {
      missingFields.push('Phone Number');
    }
    if (!merchant.address && !merchant.street_address || 
        (merchant.address && (merchant.address.trim() === '' || merchant.address === 'Not specified')) ||
        (merchant.street_address && (merchant.street_address.trim() === '' || merchant.street_address === 'Not specified'))) {
      missingFields.push('Street Address');
    }
  } else if (customer) {
    if (!customer.full_name || customer.full_name.trim() === '' || customer.full_name === 'Not specified') {
      missingFields.push('Full Name');
    }
    if (!customer.mobile_number || customer.mobile_number.trim() === '' || customer.mobile_number === 'Not specified') {
      missingFields.push('Telephone Number');
    }
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 relative">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Complete Your Profile
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            Please complete the following required fields to get the most out of your account:
          </p>
          <ul className="text-sm text-yellow-700 mb-4 list-disc list-inside">
            {missingFields.map((field, index) => (
              <li key={index}>{field}</li>
            ))}
          </ul>
          <Button
            onClick={onComplete}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Complete Profile
          </Button>
        </div>
      </div>
    </div>
  );
};