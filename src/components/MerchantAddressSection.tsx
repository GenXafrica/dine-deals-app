import React from 'react';
import { AsyncGooglePlacesInput } from '@/components/AsyncGooglePlacesInput';

interface MerchantAddressSectionProps {
  streetAddress: string;
  googleAddress: string;
  googlePlaceId: string;
  onStreetAddressChange: (value: string) => void;
  onGoogleAddressChange: (address: string, placeId?: string) => void;
  showDialog: boolean;
  onDialogClose: () => void;
  onUseGoogleAddress: () => void;
  onKeepStreetAddress: () => void;
  onEditStreetAddress: () => void;
  errors: { address?: string; googleAddress?: string };
}

export const MerchantAddressSection: React.FC<MerchantAddressSectionProps> = ({
  streetAddress,
  onStreetAddressChange,
  errors
}) => {
  return (
    <div className="space-y-4">
      <AsyncGooglePlacesInput
        value={streetAddress}
        onChange={(address) => onStreetAddressChange(address)}
        placeholder="Search for your restaurant address"
        required
        label="Street Address"
      />
      {errors.address && (
        <p className="text-xs text-red-500">{errors.address}</p>
      )}
    </div>
  );
};