import React from 'react';

interface CustomerRouteProps {
  children: React.ReactNode;
}

/**
 * Obsolete wrapper.
 * Live customer routing now uses ProtectedCustomerRoute in App.tsx.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const CustomerRoute: React.FC<CustomerRouteProps> = () => {
  return null;
};

export default CustomerRoute;