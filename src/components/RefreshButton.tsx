import React from 'react';

interface RefreshButtonProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  onClick?: () => void;
}

/**
 * Obsolete refresh button helper.
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const RefreshButton: React.FC<RefreshButtonProps> = () => {
  return null;
};

export default RefreshButton;