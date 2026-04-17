import React from 'react';
import { MerchantDashboardDeals } from './MerchantDashboardDeals';

interface MerchantDashboardDealsWithPaywallProps {
  merchant: any;
}

export const MerchantDashboardDealsWithPaywall: React.FC<MerchantDashboardDealsWithPaywallProps> = ({
  merchant,
}) => {
  return <MerchantDashboardDeals merchant={merchant} />;
};

export default MerchantDashboardDealsWithPaywall;