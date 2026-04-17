import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell } from "lucide-react";

interface MastheadProps {
  title: string;
  subtitle?: React.ReactNode;
  logoSrc?: string;
  logoAlt?: string;
  logoClassName?: string;
  storageKey?: string;
  headingTag?: "h1" | "h2" | "h3";
  containerClassName?: string;
  greet?: boolean;
  titleClassName?: string;
  subtitleClassName?: string;
  rightSlot?: React.ReactNode;
  showNotifications?: boolean;
}

const Masthead: React.FC<MastheadProps> = ({
  title,
  subtitle,
  logoSrc,
  logoAlt = "Logo",
  logoClassName = "w-16 h-16 object-cover rounded-lg",
  storageKey,
  headingTag = "h1",
  containerClassName = "",
  greet = false,
  titleClassName = "text-xl font-semibold text-gray-900 text-left",
  subtitleClassName = "text-sm text-gray-600 text-left",
  rightSlot,
  showNotifications = true,
}) => {
  const Heading = headingTag as any;

  const [preview, setPreview] = useState<string | undefined>(logoSrc);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (logoSrc) setPreview(logoSrc);
  }, [logoSrc]);

  useEffect(() => {
    if (!preview && storageKey) {
      try {
        const { data } = supabase.storage
          .from("merchant-images")
          .getPublicUrl(storageKey);
        if (data?.publicUrl) setPreview(data.publicUrl);
      } catch {}
    }
  }, [storageKey, preview]);

  useEffect(() => {
    if (!showNotifications) return;
    loadNotifications();
  }, [showNotifications]);

  const loadNotifications = async () => {
    try {
      const stored = localStorage.getItem("customer_notifications");
      let localNotifications: any[] = stored ? JSON.parse(stored) : [];

      const { data: list } = await supabase.rpc(
        "get_customer_notifications_latest"
      );

      if (list) {
        const merged = [
          ...localNotifications,
          ...list.filter(
            (n: any) => !localNotifications.find((l) => l.id === n.id)
          ),
        ];

        setNotifications(merged);
        localStorage.setItem(
          "customer_notifications",
          JSON.stringify(merged)
        );
      } else {
        setNotifications(localNotifications);
      }

      const { data: count } = await supabase.rpc(
        "get_customer_unread_notification_count"
      );
      if (typeof count === "number") setUnreadCount(count);
    } catch {}
  };

  const handleNotificationClick = async (n: any) => {
    try {
      await supabase.rpc("mark_customer_notification_read", {
        p_notification_id: n.id,
      });

      setDropdownOpen(false);

      if (typeof window !== "undefined") {
        window.location.href = `/customer-dashboard#deal-${n.deal_id}`;
      }
    } catch {}
  };

  const handleCloseNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    const updated = notifications.filter((n) => n.id !== id);

    setNotifications(updated);

    localStorage.setItem(
      "customer_notifications",
      JSON.stringify(updated)
    );
  };

  const displayedTitle = greet ? `Hello, ${title}` : title;

  return (
<header
  className={`flex items-center justify-between pl-3 pr-3 py-2 ${containerClassName}`}
      role="banner"
      aria-label="Masthead"
    >
      <div className="flex items-center gap-2">
        {preview && (
          <img src={preview} alt={logoAlt} className={logoClassName} />
        )}

        <div className="flex flex-col">
          <Heading className={titleClassName}>{displayedTitle}</Heading>
          {subtitle && (
            <div className={subtitleClassName}>{subtitle}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 h-8 leading-none">
        {showNotifications && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative"
            >
<Bell
  className={`w-8 h-8 ${
    unreadCount > 0 ? "text-amber-500" : "text-gray-700"
  }`}
/>

              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1">
                  {notifications.length}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow-lg z-50">
                <div className="px-3 py-2 text-sm font-semibold border-b">
                  New Deals
                </div>

                {notifications.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">
                    No new deals
                  </div>
                )}

                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="relative px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  >
                    <button
                      onClick={(e) => handleCloseNotification(e, n.id)}
                      className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ×
                    </button>

                    <div className="font-semibold">{n.restaurant_name}</div>
                    <div className="text-xs text-gray-500">
                      {n.deal_title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {rightSlot}
      </div>
    </header>
  );
};

export default Masthead;