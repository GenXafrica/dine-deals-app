import React from 'react';

interface HomeButtonProps {
  onClick: () => void;
  className?: string;
}

/**
 * Obsolete home button helper.
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const HomeButton: React.FC<HomeButtonProps> = () => {
  return null;
};

export default HomeButton;