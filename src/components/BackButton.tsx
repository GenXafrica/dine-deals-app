import React from 'react';

interface BackButtonProps {
  onBack?: () => void;
  to?: string;
  className?: string;
}

/**
 * Obsolete back button helper.
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const BackButton: React.FC<BackButtonProps> = () => {
  return null;
};

export default BackButton;