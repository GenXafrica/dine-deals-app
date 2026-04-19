import React from 'react';

interface ResendEmailsButtonProps {
  email: string;
}

/**
 * Obsolete email resend/test button.
 * Live email handling now follows the active backend queue/worker flow.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export default function ResendEmailsButton(_: ResendEmailsButtonProps) {
  return null;
}