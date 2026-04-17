import { useState } from "react";

export type UserRole = "customer" | "merchant" | "admin" | null;

export const useRoleBasedRouting = () => {
  // Routing is handled exclusively by AuthCallback.
  // This hook is intentionally disabled to prevent competing redirects.

  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false);

  return {
    getUserRole: async () => null,
    redirectByRole: async () => null,
    redirectBasedOnRole: async () => null,
    handlePostLoginRedirect: async () => null,
    showAccountTypeModal,
    setShowAccountTypeModal,
  };
};
