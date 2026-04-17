import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const FOOTER_HEIGHT_PX = 96;

export function InnerFooterButtons(): JSX.Element | null {
  const location = useLocation();
  const navigate = useNavigate();
  const rawPathname = location?.pathname || "";
  const pathname = rawPathname.toLowerCase().replace(/\/$/, "");
  const [isLeftDisabled, setIsLeftDisabled] = useState(false);

  const container = useMemo(() => {
    if (typeof document === "undefined") return null;
    const id = "dd-footer-portal";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style.position = "fixed";
      el.style.left = "0";
      el.style.right = "0";
      el.style.bottom = "0";
      el.style.zIndex = "99999";
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  useEffect(() => {
    const prevPadding = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${FOOTER_HEIGHT_PX}px`;
    return () => {
      document.body.style.paddingBottom = prevPadding;
    };
  }, []);

  useEffect(() => {
    const handleFooterUpdate = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as any;
        if (!detail || typeof detail !== "object") return;

        if (typeof detail.disabled === "boolean") {
          setIsLeftDisabled(detail.disabled);
          return;
        }

        if (detail.left && typeof detail.left.disabled === "boolean") {
          setIsLeftDisabled(detail.left.disabled);
        }
      } catch {}
    };

    window.addEventListener("footer-update", handleFooterUpdate as EventListener);
    return () => {
      window.removeEventListener("footer-update", handleFooterUpdate as EventListener);
    };
  }, []);

  const isMerchantProfile =
    pathname === "/merchant-profile" ||
    pathname.startsWith("/merchant-profile/");

  const isCustomerProfile =
    pathname === "/customer-profile" ||
    pathname === "/profile" ||
    pathname.startsWith("/customer-profile/");

  const isDashboard = pathname.includes("dashboard");

  const dispatchOnly = async (side: "left" | "right") => {
    // LEFT BUTTON
    if (side === "left") {
      if (isDashboard && !isCustomerProfile && !isMerchantProfile) {
        if (pathname.includes("merchant")) {
          navigate("/merchant-profile");
        } else {
          navigate("/customer-profile");
        }
        return;
      }

      try {
        window.dispatchEvent(
          new CustomEvent("dinedeals:footer-action", { detail: side })
        );
      } catch {}
      return;
    }

    // RIGHT BUTTON (Cancel logic FIXED for CUSTOMER ONLY)
    if (side === "right") {
 if (isCustomerProfile) {
  try {
    window.dispatchEvent(
      new CustomEvent("dinedeals:footer-action", { detail: side })
    );
  } catch {}
  return;
}

      // MERCHANT stays unchanged
      if (isMerchantProfile) {
        try {
          window.dispatchEvent(
            new CustomEvent("dinedeals:footer-action", { detail: side })
          );
        } catch {}
        return;
      }

      // Default sign out
      await supabase.auth.signOut();
      navigate("/login");
      return;
    }
  };

  if (!container) return null;

  let leftLabel = "Edit Profile";
  let rightLabel = "Sign out";
  let leftAria = "Edit profile";
  let rightAria = "Sign out";

  if (isCustomerProfile || isMerchantProfile) {
    leftLabel = "Save Profile";
    rightLabel = "Cancel";
    leftAria = "Save profile";
    rightAria = "Cancel";
  }

  const footer = (
    <div
      role="region"
      aria-label="Footer actions"
      id="dd-footer-portal-inner"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        boxSizing: "border-box",
        padding: "0.75rem",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        background: "white",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        pointerEvents: "auto",
      }}
    >
      <div className="flex gap-3 px-4">
        <Button
          onClick={() => dispatchOnly("left")}
          aria-label={leftAria}
          disabled={isLeftDisabled}
          className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
        >
          {leftLabel}
        </Button>

        <Button
          onClick={() => dispatchOnly("right")}
          aria-label={rightAria}
          className="flex-1 h-12 bg-gray-400 hover:bg-gray-500 text-white"
        >
          {rightLabel}
        </Button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(footer, container);
}

export default function FooterButtons(props: any) {
  const location = useLocation();
  const path = (location?.pathname || "").toLowerCase();

  if (path.includes("dashboard") && !path.includes("merchant-profile")) {
    return null;
  }

  return <InnerFooterButtons {...props} />;
}