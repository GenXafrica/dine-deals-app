import React from 'react';

interface EmailVerificationNoticeProps {
  email: string;
  userType: 'customer' | 'merchant';
}

/**
 * Obsolete email verification notice.
 * Live verification flow uses the dedicated verify-email route.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const EmailVerificationNotice: React.FC<EmailVerificationNoticeProps> = () => {
  return null;
};

export default EmailVerificationNotice;