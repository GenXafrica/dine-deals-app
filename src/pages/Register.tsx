import React from 'react';

interface CustomerRegisterFormProps {
  onSuccess?: () => void;
}

/**
 * Obsolete customer register form.
 * Live register flow uses NewRegisterForm via src/pages/Register.tsx.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const CustomerRegisterForm: React.FC<CustomerRegisterFormProps> = () => {
  return null;
};

export default CustomerRegisterForm;