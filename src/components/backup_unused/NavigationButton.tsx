import React from 'react';

interface NavigationButtonProps {
  address: string;
  businessName: string;
}

/**
 * Obsolete navigation button helper.
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const NavigationButton: React.FC<NavigationButtonProps> = () => {
  return null;
};

export default NavigationButton;