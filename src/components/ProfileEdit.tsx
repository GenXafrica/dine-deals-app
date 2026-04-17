import React from 'react';

interface ProfileEditProps {
  user?: unknown;
  merchant?: unknown;
  onClose?: () => void;
}

/**
 * Obsolete shared profile editor.
 * Live customer flow uses CustomerProfileEdit.
 * Live merchant flow uses MerchantProfileEdit.
 *
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const ProfileEdit: React.FC<ProfileEditProps> = () => {
  return null;
};

export default ProfileEdit;