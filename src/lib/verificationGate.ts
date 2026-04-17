// src/lib/verificationGate.ts
// DISABLED — routing is handled exclusively by usePostLoginRedirect

export async function ensureEmailVerifiedOrRedirect(): Promise<boolean> {
  return true;
}

export function consumeVerifyEmailToastFlag(): boolean {
  return false;
}
