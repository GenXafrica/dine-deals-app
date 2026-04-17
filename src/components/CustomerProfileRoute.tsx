import React from 'react';

/**
 * Obsolete wrapper.
 * Live customer profile routing now happens in App.tsx via:
 * ProtectedCustomerRoute -> CustomerProfileEdit
 *
 * This file is kept as a safe no-op placeholder only so imports/builds do not break
 * if anything old still references it.
 */
export const CustomerProfileRoute: React.FC = () => {
  return null;
};

export default CustomerProfileRoute;