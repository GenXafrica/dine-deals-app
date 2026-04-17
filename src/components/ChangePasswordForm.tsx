import React from 'react';

interface ChangePasswordFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Obsolete standalone change password form.
 * Live customer password change is handled inside CustomerProfileEdit.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = () => {
  return null;
};

export default ChangePasswordForm;