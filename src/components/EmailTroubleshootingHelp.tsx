import React from 'react';

interface EmailTroubleshootingHelpProps {
  userEmail?: string;
  onResendEmail?: () => void;
}

/**
 * Obsolete email troubleshooting helper.
 * Live verification flow uses the dedicated verify-email route.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const EmailTroubleshootingHelp: React.FC<EmailTroubleshootingHelpProps> = () => {
  return null;
};

export default EmailTroubleshootingHelp;