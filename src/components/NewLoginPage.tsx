import React from 'react';

interface NewLoginPageProps {
  onBack?: () => void;
  onSuccess?: () => void;
  userType?: 'customer' | 'merchant' | null;
}

/**
 * Obsolete alternate login page wrapper.
 * Live login flow uses LoginPage.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const NewLoginPage: React.FC<NewLoginPageProps> = () => {
  return null;
};

export default NewLoginPage;