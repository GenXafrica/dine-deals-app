import React from 'react';

interface InstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
}

/**
 * Obsolete install prompt dialog.
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export const InstallPrompt: React.FC<InstallPromptProps> = () => {
  return null;
};

export default InstallPrompt;