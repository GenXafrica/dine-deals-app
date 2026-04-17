import React from 'react';

interface TestEmailInputProps {
  testEmail: string;
  onTestEmailChange: (email: string) => void;
}

/**
 * Obsolete email test input helper.
 * This file is kept as a safe no-op placeholder only so any old reference
 * will not break the build.
 */
export default function TestEmailInput(_: TestEmailInputProps) {
  return null;
}