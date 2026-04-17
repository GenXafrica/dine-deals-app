import React, { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import Masthead from "@/components/Masthead";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import CustomerDealsViewRender from "@/components/CustomerDealsViewRender";
import CategoryFilter from "@/components/CategoryFilter";
import { shortenAddress } from "@/components/AddressUtils";
import { Filter, Settings } from "lucide-react";

export default function CustomerDashboard(): JSX.Element {
  const navigate = useNavigate();


  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
useEffect(() => {
  if ((window as any).L) return;

  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.async = true;
  document.body.appendChild(script);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}, []);

  const LoadingOverlay = () => (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#FFFFFF",
      zIndex: 9999
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        border: "6px solid #E5E7EB",
        borderTop: "6px solid #2563EB",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{ marginTop: 16, fontSize: 14, color: "#374151" }}>
        Good things take a moment… finding your deals
      </p>
      <style>
        {`@keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }`}
      </style>
    </div>
  );

  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [showMap, setShowMap] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt?: string } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  const [offset, setOffset] = useState(0);
  const [hasMoreDeals, setHasMoreDeals] = useState(false);
  const PAGE_SIZE = 5;

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const dealsContainerRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapMarkersRef = useRef<any[]>([]);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | null>(null);

  const [customerFullName, setCustomerFullName] = useState<string | null>(null);

  const [showAccountSheet, setShowAccountSheet] = useState(false);
const openAccountSheet = () => {
  (window as any).__BOTTOM_SHEET_OPEN__ = true;
  window.dispatchEvent(new Event("dd:sheet"));
  setShowAccountSheet(true);
};

const closeAccountSheet = () => {
  (window as any).__BOTTOM_SHEET_OPEN__ = false;
  window.dispatchEvent(new Event("dd:sheet"));
  setShowAccountSheet(false);
};

  const handleAccountEditProfile = () => {
    flushSync(() => {
      setShowAccountSheet(false);
    });
    navigate("/customer-profile", { state: { allowEdit: true } });
  };

const handleAccountSignOut = async () => {
  (window as any).__BOTTOM_SHEET_OPEN__ = false;
  window.dispatchEvent(new Event("dd:sheet"));
  closeAccountSheet();
  await supabase.auth.signOut();
  navigate("/");
};

  const requestIdRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const truncateText = (t?: string, l: number = 120) =>
    !t ? "" : t.length <= l ? t : t.substring(0, l).trim() + "...";

  const truncateAddress = (a?: string) => shortenAddress(a, 40);

  const isExpiringToday = (endsAt?: string) => {
    if (!endsAt) return false;
    const endDate = new Date(endsAt);
    const now = new Date();
    return (
  
      endDate.getDate() === now.getDate() &&
      endDate.getMonth() === now.getMonth() &&
      endDate.getFullYear() === now.getFullYear()
    );
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevHeight = document.body.style.height;
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    return () => {
      document.body.style.overflow = prevOverflow ?? "";
      document.body.style.height = prevHeight ?? "";
    };
  }, []);
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported in this browser.");
      return;
    }

    // Run AFTER first paint
    setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => setError("Unable to get location. Use test location or allow location."),
        { maximumAge: 60000, timeout: 7000 }
      );
    }, 0);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCustomerName() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;

        const { data: customer, error } = await supabase
          .from("customers")
          .select("first_name,last_name")
          .eq("user_id", userId)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          const { data: userRes } = await supabase.auth.getUser();
          const fallbackName =
            userRes?.user?.user_metadata?.full_name || userRes?.user?.email || null;
          setCustomerFullName(fallbackName);
        } else {
          setCustomerFullName(
            customer
              ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
              : null
          );
        }
      } catch {
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const fallbackName =
            userRes?.user?.user_metadata?.full_name || userRes?.user?.email || null;
          if (mounted) setCustomerFullName(fallbackName);
        } catch {}
      }
    }

    loadCustomerName();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadCustomerName();
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const fetchDeals = async (
    forceLat?: number | null,
    forceLng?: number | null,
    nextOffset: number = 0,
    append: boolean = false
  ) => {
    const useLat = typeof forceLat === "number" ? forceLat : lat;
    const useLng = typeof forceLng === "number" ? forceLng : lng;

    if (useLat === null || useLng === null) {
      setError("missing_location");
      setDeals([]);
      setHasMoreDeals(false);
      return;
    }

    const localRequestId = ++requestIdRef.current;
    isFetchingRef.current = true;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setDeals([]);
      setOffset(0);
      setHasMoreDeals(false);
    }

    setError(null);

    const rpcParams = {
      p_category: selectedCategory || null,
      p_latitude: useLat,
      p_longitude: useLng,
      p_radius_km: radiusKm,
      p_limit: PAGE_SIZE,
      p_offset: nextOffset,
    };

    try {
      const rpcCall = supabase.rpc("get_deals_within_radius", rpcParams as any);
      const result = await rpcCall;

      const data = result && result.data !== undefined ? result.data : result;
      const error = result && result.error !== undefined ? result.error : null;

      if (localRequestId !== requestIdRef.current) return;

      if (error) {
        if (!append) setDeals([]);
        setHasMoreDeals(false);
        setError(error?.message || "RPC error");
        return;
      }

      const rows: any[] = Array.isArray(data) ? data : (data as any)?.rows || [];

      if (!rows || rows.length === 0) {
        if (!append) setDeals([]);
        setHasMoreDeals(false);
        return;
      }

      const dealIds = Array.from(new Set(rows.map((r: any) => r?.id).filter(Boolean)));

      const merchantIds = Array.from(
        new Set(rows.map((r: any) => r?.merchant_id).filter(Boolean))
      );

      let merchantsMap: Record<string, any> = {};

      if (merchantIds.length) {
        const { data: merchData } = await supabase
          .from("merchants")
          .select(
            "id,name,category,logo,logo_url,phone,address,website,web_address,whatsapp_number"
          )
          .in("id", merchantIds);

        if (Array.isArray(merchData)) {
          merchData.forEach((m: any) => {
            if (m?.id) merchantsMap[m.id] = m;
          });
        }
      }

      let dealsMap: Record<string, any> = {};

      if (dealIds.length) {
        const { data: dealsData } = await supabase
          .from("deals")
          .select("id,price,image,images,repeat")
          .in("id", dealIds);

        if (Array.isArray(dealsData)) {
          dealsData.forEach((d: any) => {
            if (d?.id) dealsMap[d.id] = d;
          });
        }
      }

      const parseImages = (v: any) => {
        if (!v) return [];
        if (Array.isArray(v)) return v.filter(Boolean).map(String);

        if (typeof v === "string") {
          try {
            const p = JSON.parse(v);

            if (Array.isArray(p)) return p.filter(Boolean).map(String);

            if (p && typeof p === "object") {
              return Object.values(p)
                .filter((x) => typeof x === "string" && x)
                .map(String);
            }
          } catch {
            return v.split(",").map((s) => s.trim()).filter(Boolean);
          }
        }

        return [];
      };

      const safeMergeMerchant = (base: any, extra: any) => {
        if (!extra || typeof extra !== "object") return { ...base };

        const merged = { ...base };

        for (const [key, value] of Object.entries(extra)) {
          if (value !== null && value !== undefined && value !== "") {
            merged[key] = value;
          }
        }

        return merged;
      };

      const normalized = (rows || []).map((r: any) => {
        const merchantObj = {
          id: r?.merchant_id ?? null,
          name: r?.merchant_name ?? null,
          logo: r?.merchant_logo ?? null,
          logo_url: r?.merchant_logo ?? null,
          phone: r?.merchant_phone ?? null,
          address: r?.merchant_address ?? null,
          website: r?.merchant_website ?? null,
          whatsapp: r?.merchant_whatsapp ?? null,
          category: r?.merchant_category ?? null,
latitude: r?.merchants?.[0]?.latitude ?? null,
longitude: r?.merchants?.[0]?.longitude ?? null,
        };

        const merchantId = merchantObj?.id ?? r?.merchant_id ?? null;

        const merchantExtra = (merchantId && merchantsMap[merchantId]) || {};
        const dealExtra = (r?.id && dealsMap[r.id]) || {};

        const rowImgs = parseImages(r?.images);
        const dealImgs = parseImages(dealExtra?.images);
        const merchImgs = parseImages(
          merchantExtra?.images || merchantExtra?.photos || merchantExtra?.pictures
        );

        const resolvedImage =
          (typeof r?.image === "string" && r.image) ||
          (dealExtra?.image && dealExtra.image) ||
          (rowImgs.length && rowImgs[0]) ||
          (dealImgs.length && dealImgs[0]) ||
          merchantExtra?.logo_url ||
          merchantExtra?.logo ||
          (merchImgs.length && merchImgs[0]) ||
          null;

        const resolvedPrice =
          r?.price ?? (typeof dealExtra?.price !== "undefined" ? dealExtra.price : null);

        const finalImages =
          rowImgs.length > 0
            ? rowImgs
            : dealImgs.length > 0
            ? dealImgs
            : merchImgs.length > 0
            ? merchImgs
            : resolvedImage
            ? [resolvedImage]
            : [];

        const repeatFromRow =
          r?.repeat_days ??
          (r?.repeat && Array.isArray(r.repeat?.days) ? r.repeat.days : undefined) ??
          undefined;

        const repeatFromDealExtra =
          (dealExtra as any)?.repeat_days ??
          ((dealExtra as any)?.repeat &&
          Array.isArray((dealExtra as any).repeat?.days)
            ? (dealExtra as any).repeat.days
            : undefined) ??
          undefined;

        const finalRepeatDays =
          (Array.isArray(repeatFromRow) && repeatFromRow.length
            ? repeatFromRow
            : null) ||
          (Array.isArray(repeatFromDealExtra) && repeatFromDealExtra.length
            ? repeatFromDealExtra
            : null) ||
          null;

        const finalRepeatObject = finalRepeatDays
          ? { days: finalRepeatDays }
          : (dealExtra as any)?.repeat ?? r?.repeat ?? null;

        const mergedMerchant = safeMergeMerchant(merchantObj, merchantExtra);

        return {
          ...r,
          merchants: mergedMerchant ? [mergedMerchant] : [],
          image: resolvedImage,
          images: finalImages,
          price: resolvedPrice,
          repeat_days: finalRepeatDays,
          repeat: finalRepeatObject,
        };
      });

// 1. Show raw deals immediately
if (!append) {
  setDeals(rows || []);
} else {
  setDeals((prev) => [...prev, ...(rows || [])]);
}

// 2. Enrich deals after render (non-blocking)
setTimeout(() => {
  setDeals((prev) => {
    if (!append) return normalized || [];

    const existingIds = new Set(prev.map((d: any) => d?.id));
    const newOnes = (normalized || []).filter(
      (d: any) => !existingIds.has(d?.id)
    );

    return [...prev, ...newOnes];
  });
}, 0);

      setOffset(nextOffset);
      setHasMoreDeals(rows.length === PAGE_SIZE);
    } catch (err: any) {
      if (localRequestId === requestIdRef.current) {
        if (!append) setDeals([]);
        setHasMoreDeals(false);
        setError(err?.message || "RPC failed");
      }
    } finally {
      if (localRequestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    }
  };

useEffect(() => {
  if (lat !== null && lng !== null) {
    fetchDeals(lat, lng, 0, false);
  }
}, [lat, lng, radiusKm, selectedCategory]);

// FIX: refetch when returning via back button
useEffect(() => {
  const handleFocus = () => {
    if (lat !== null && lng !== null && !isFetchingRef.current) {
      fetchDeals(lat, lng, 0, false);
    }
  };

  window.addEventListener("focus", handleFocus);
  window.addEventListener("pageshow", handleFocus);

  return () => {
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("pageshow", handleFocus);
  };
}, [lat, lng, radiusKm, selectedCategory]);

  const handleRadiusSelect = (k: number) => {
    setRadiusKm(k);
  };

  const handleShowMoreDeals = () => {
    if (loading || loadingMore || !hasMoreDeals) return;
    fetchDeals(lat, lng, offset + PAGE_SIZE, true);
  };

  const computeAndOpenFilter = () => {
    const viewportWidth = window.innerWidth;

    const desiredWidth = Math.min(
      360,
      Math.max(280, Math.floor(viewportWidth - 32))
    );

    const left = Math.max(8, Math.floor((viewportWidth - desiredWidth) / 2));

    const dealsRect = dealsContainerRef.current?.getBoundingClientRect();

    const top = dealsRect
      ? Math.max(8, dealsRect.top)
      : (filterButtonRef.current?.getBoundingClientRect().bottom ?? 0) + 8;

    setPopoverStyle({
      position: "fixed",
      top,
      left,
      width: Math.min(desiredWidth, viewportWidth - 16),
      zIndex: 200,
      background: "#fff",
      borderRadius: 10,
      boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
      padding: 10,
    });

    setShowCategoryFilter(true);
  };

  const handleOpenCategoryFilter = () => computeAndOpenFilter();

  const handleCloseCategoryFilter = () => {
    setShowCategoryFilter(false);
    setPopoverStyle(null);
  };

  useEffect(() => {
    if (!showCategoryFilter) return;

    const onResize = () => computeAndOpenFilter();
    const onScroll = () => computeAndOpenFilter();

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [showCategoryFilter, deals]);

  const onCategoryFinalChange = (summary: string) => {
    setSelectedCategory(summary);
    handleCloseCategoryFilter();
  };

  const onCategoriesChange = (arr: string[]) => {
    if (!arr || arr.length === 0) {
      setSelectedCategory("");
      return;
    }

    setSelectedCategory(arr.join(","));
  };

  const handleImageClick = (img: { url: string; alt?: string } | null) =>
    setSelectedImage(img);

  const handleCloseModal = () => {
    setSelectedImage(null);
    setExpandedDeal(null);
  };

  const handleNavigate = (p: string) => navigate(p);

  const toggleDealExpansion = (id: string | null) => setExpandedDeal(id);

  const handleEditProfile = () =>
    navigate("/customer-profile", { state: { allowEdit: true } });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };


  useEffect(() => {
    const L = (window as any).L;

    if (!showMap) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      mapMarkersRef.current = [];
      return;
    }

    if (!L || !mapContainerRef.current || lat === null || lng === null) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([lat, lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapInstanceRef.current);
    } else {
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
    }

    mapMarkersRef.current.forEach((marker: any) => {
      try {
        marker.remove();
      } catch {}
    });
    mapMarkersRef.current = [];

const groups: Record<string, { merchant: any; deals: any[] }> = {};

deals.forEach((d: any) => {
  const m = d?.merchants?.[0];
  if (!m?.id) return;

  if (!groups[m.id]) {
    groups[m.id] = { merchant: m, deals: [] };
  }

  groups[m.id].deals.push(d);
});

Object.values(groups).forEach((group: any) => {
  const m = group.merchant;

  const latNum = parseFloat(m?.latitude);
  const lngNum = parseFloat(m?.longitude);

  if (isNaN(latNum) || isNaN(lngNum)) return;

  const icon = L.divIcon({
  className: "",
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;">
<div style="
  background:#DC2626;
  color:#FFFFFF;
  font-size:11px;
  font-weight:500;
  padding:3px 8px;
  border-radius:999px;
  margin-bottom:6px;
  white-space:nowrap;
  box-shadow:0 2px 6px rgba(0,0,0,0.2);
">
        ${m.name || ""}
      </div>
      <img src="https://cdn-icons-png.flaticon.com/512/684/684908.png" style="width:30px;height:30px;" />
    </div>
  `,
iconSize: [30, 30],
iconAnchor: [15, 30],
});

const marker = L.marker([latNum, lngNum], { icon }).addTo(mapInstanceRef.current);

  marker.on("click", () => {
    setExpandedDeal(group.deals[0]?.id ?? null);
    setShowMap(false);
  });

  mapMarkersRef.current.push(marker);
});

    setTimeout(() => {
      try {
        mapInstanceRef.current?.invalidateSize?.();
      } catch {}
    }, 100);
  }, [showMap, lat, lng]);

  const firstName =
    (customerFullName || "Customer").toString().split(" ")[0] || "Customer";

  const accountSheetNode =
    showAccountSheet && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              onClick={closeAccountSheet}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.25)",
                pointerEvents: "auto",
                zIndex: 9998,
              }}
            />
            <div
              role="dialog"
              aria-label="Account actions"
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                background: "#FFFFFF",
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                zIndex: 9999,
                padding: 16,
              }}
            >
              <div className="flex gap-3">
                <button
                  onClick={handleAccountEditProfile}
                  className="flex-1 h-12 rounded-lg px-4 text-center"
                  style={{ background: "#16A34A", color: "#FFFFFF" }}
                >
                  Edit Profile
                </button>

                <button
                  onClick={handleAccountSignOut}
                  className="flex-1 h-12 rounded-lg px-4 text-center"
                  style={{ background: "#9CA3AF", color: "#FFFFFF" }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
  <>
    <main
      className="flex-1 flex flex-col px-2"
      style={{
        minHeight: 0,
        height: "100vh",
        overflow: "hidden",
        pointerEvents: showAccountSheet ? "none" : "auto",
      }}
    >
      <Masthead
        logoSrc="https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/icon-192.png"
        logoClassName="w-16 h-16 object-cover rounded-full"
        headingTag="h2"
        title={firstName}
        greet={true}
        forCustomerDashboard={true}
        titleClassName="text-2xl font-bold text-gray-900 whitespace-normal break-words"
        containerClassName="flex items-center justify-between gap-4 pt-6 mb-2"
        rightSlot={
<button
  type="button"
  aria-label="Account settings"
  onClick={openAccountSheet}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    cursor: "pointer",
  }}
>
            <Settings size={32} />
          </button>
        }
      />

      <section style={{ marginTop: 4, marginBottom: 8 }}>
        <h2 className="text-sm font-medium text-gray-800 mb-2">
          Search radius
        </h2>

        <div className="mb-3 flex gap-2">
          {[3, 5, 10].map((k) => (
            <button
              key={k}
              onClick={() => handleRadiusSelect(k)}
              aria-pressed={radiusKm === k}
              style={{
                flex: "1 1 0",
                minWidth: 64,
                padding: "0.5rem 0.75rem",
                borderRadius: 10,
                border:
                  radiusKm === k
                    ? "1px solid transparent"
                    : "1px solid #F3F4F6",
                whiteSpace: "nowrap",
                fontSize: 14,
                background: radiusKm === k ? "#2563EB" : "#FFFFFF",
                color: radiusKm === k ? "#FFFFFF" : "#1F2937",
              }}
            >
              {k} km
            </button>
          ))}

          <button
            onClick={() => setShowMap(true)}
            style={{
              flex: "1 1 0",
              minWidth: 64,
              padding: "0.5rem 0.75rem",
              borderRadius: 10,
              border: "1px solid #F3F4F6",
              background: "#FFFFFF",
              color: "#1F2937",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            Map
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <button
            ref={filterButtonRef}
            onClick={handleOpenCategoryFilter}
            className="w-full h-11 rounded-lg font-medium shadow-sm flex items-center justify-center"
            style={{
              background: "#2563EB",
              color: "white",
              minHeight: 44,
              marginBottom: 0,
            }}
          >
            <Filter className="w-5 h-5" />
            <span style={{ marginLeft: 8 }}>
              Filter{selectedCategory ? `: ${selectedCategory}` : ""}
            </span>
          </button>

          {showCategoryFilter && popoverStyle && (
            <div style={popoverStyle as React.CSSProperties}>
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={onCategoryFinalChange}
                onCategoriesChange={onCategoriesChange}
              />
            </div>
          )}
        </div>
      </section>

      <div
        ref={dealsContainerRef}
        className="flex-1 overflow-auto"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom:
            "calc(16px + env(safe-area-inset-bottom, 8px))",
        }}
      >
        <CustomerDealsViewRender
          deals={deals}
          loading={loading}
          radiusKm={radiusKm}
          selectedCategory={selectedCategory}
          showRadiusSelector={false}
          selectedImage={selectedImage}
          expandedDeal={expandedDeal}
          handleRadiusSelect={setRadiusKm}
          handleCategoryChange={setSelectedCategory}
          handleBackToRadiusSelector={() => setSelectedCategory("")}
          handleImageClick={handleImageClick}
          handleCloseModal={handleCloseModal}
          handleNavigate={handleNavigate}
          truncateAddress={truncateAddress}
          toggleDealExpansion={toggleDealExpansion}
          truncateText={truncateText}
          isExpiringToday={isExpiringToday}
        />

        {!loading && deals.length > 0 && hasMoreDeals && (
          <div className="px-2 pb-4 pt-2">
            <Button
              type="button"
              onClick={handleShowMoreDeals}
              disabled={loadingMore}
              className="w-full"
            >
              {loadingMore ? "Loading..." : "Show More Deals"}
            </Button>
          </div>
        )}

        {!loading && !loadingMore && error && (
          <div className="px-2 pb-4 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {accountSheetNode}
    


    
{showMap && (
  <div style={{ position: "fixed", inset: 0, background: "#e5e7eb", zIndex: 9999 }}>
<button
  onClick={() => setShowMap(false)}
  aria-label="Close map"
  style={{
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10000,
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
  }}
>
  ×
</button>

    <div
      ref={mapContainerRef}
      style={{
        position: "absolute",
        inset: 0,
      }}
    />
  </div>
)}


    </main>
  </>
  );
}
