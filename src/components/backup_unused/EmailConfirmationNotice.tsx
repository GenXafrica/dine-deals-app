import React from 'react';

interface EmailConfirmationNoticeProps {
  email: string;
  onResend?: () => void;
}

/**
 * Obsolete email confirmation notice.
 * Live verification flow uses the dedicated verify-email path.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const EmailConfirmationNotice: React.FC<EmailConfirmationNoticeProps> = () => {
  return null;
};

export default EmailConfirmationNotice;