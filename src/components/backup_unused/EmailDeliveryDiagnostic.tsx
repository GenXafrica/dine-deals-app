import React from 'react';

interface EmailDeliveryDiagnosticProps {
  testEmail: string;
  emailResult: any;
}

/**
 * Obsolete email delivery diagnostic component.
 * Live email handling now follows the active backend queue/worker flow.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
const EmailDeliveryDiagnostic: React.FC<EmailDeliveryDiagnosticProps> = () => {
  return null;
};

export default EmailDeliveryDiagnostic;