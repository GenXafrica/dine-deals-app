import React from 'react';

interface EmailConfirmationServiceProps {
  userId: string;
  tier: string;
  billingCycle: string;
  amountPaid: number;
  renewalDate: string;
}

/**
 * Obsolete email confirmation service component.
 * Live email handling now follows the active backend queue/worker flow.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const EmailConfirmationService: React.FC<EmailConfirmationServiceProps> = () => {
  return null;
};

export default EmailConfirmationService;