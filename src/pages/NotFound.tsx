// src/pages/NotFound.tsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname || "";

    // If the user attempted to access any /verify variant, forward them into the client-side /verify route.
    // This avoids the "User attempted to access non-existent route" console error and lets the Verify page run.
    if (path.startsWith("/verify")) {
      // Preserve query string so token/email are passed through
      const qs = window.location.search || "";
      navigate(`/verify${qs}`, { replace: true });
      return;
    }

    // Keep the console error for other truly missing routes (helpful for debugging)
    console.error("404 Error: User attempted to access non-existent route:", path);
  }, [location.pathname, navigate]);

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Page not found</h1>
      <p className="mb-4">
        The page you are looking for does not exist or has been moved.
      </p>

      <div className="flex gap-2">
        <Button onClick={() => navigate("/", { replace: true })}>Go home</Button>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </div>
  );
}
