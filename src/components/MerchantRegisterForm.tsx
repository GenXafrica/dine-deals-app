import React from 'react';

interface MerchantRegisterFormProps {
  onSuccess?: () => void;
}

/**
 * Obsolete merchant register form.
 * Live register flow uses NewRegisterForm.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const MerchantRegisterForm: React.FC<MerchantRegisterFormProps> = () => {
  return null;
};

export default MerchantRegisterForm;