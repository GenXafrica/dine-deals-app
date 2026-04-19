import React, { useMemo, useState } from "react";
import DealCard from "./DealCard";
import ExpandedDealView from "./ExpandedDealView";

type Merchant = {
  id?: string;
  name?: string | null;
  logo?: string | null;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  category?: string | null;
  [k: string]: any;
};

type Deal = {
  id?: string;
  merchant_id?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  valid_until?: string | null;
  merchants?: any;
  image?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  [k: string]: any;
};

export default function CustomerDealsViewRender(props: {
  deals?: any;
  loading?: boolean;
  radiusKm?: number;
  selectedCategory?: string | null;
  showRadiusSelector?: boolean;
  onNavigate?: (path: string) => void;
  setRadiusKm?: (radius: number) => void;
}) {

  const { deals, loading, radiusKm = 5, onNavigate } = props;

const rows = useMemo(() => {
  let list: Deal[] = [];

  if (!deals) list = [];
  else if (Array.isArray(deals)) list = deals as Deal[];
  else if (deals?.sample && Array.isArray(deals.sample)) list = deals.sample as Deal[];
  else if (deals?.rows && Array.isArray(deals.rows)) list = deals.rows as Deal[];
  else if (deals?.data && Array.isArray(deals.data)) list = deals.data as Deal[];
  else list = [];

  if (typeof window === "undefined") return list;

  const hash = window.location.hash;

  if (!hash || !hash.startsWith("#deal-")) return list;

  const dealId = hash.replace("#deal-", "");

  const index = list.findIndex((r) => r.id === dealId);

  if (index <= 0) return list;

  const copy = [...list];
  const [deal] = copy.splice(index, 1);
  copy.unshift(deal);

return copy;

}, [deals, typeof window !== "undefined" ? window.location.hash : null]);

  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  function toggleDealExpansion(id?: string) {
    if (!id) return setExpandedDeal(null);
    setExpandedDeal((s) => (s === id ? null : id));
  }

  const expandedDealObj = useMemo(() => {
    if (!expandedDeal) return null;
    return rows.find((r) => r.id === expandedDeal) ?? null;
  }, [rows, expandedDeal]);

  const truncateAddress = (a?: string | null, len = 40) => {
    if (!a) return "";
    if (a.length <= len) return a;
    return a.slice(0, len - 1) + "…";
  };

  const truncateText = (t?: string | null, len = 100) => {
    if (!t) return "";
    if (t.length <= len) return t;
    return t.slice(0, len - 1) + "…";
  };

  const handleImageClick = (image: { url: string; alt: string } | null) => {
    console.debug("[CustomerDealsViewRender] image click", image);
  };

  const handlePhoneCall = (phone?: string) => {
    console.debug("[CustomerDealsViewRender] phone call", phone);
  };

  const handleNavigate = (path: string) => {
    if (onNavigate) return onNavigate(path);
    if (typeof window !== "undefined") window.location.href = path;
  };

  const resolveDealImage = (d: any) => {
    if (!d) return null;

    if (Array.isArray(d.images) && d.images.length > 0) {
      return d.images[0];
    }

    if (typeof d.image_url === "string" && d.image_url.trim()) {
      return d.image_url;
    }

    if (typeof d.image === "string" && d.image.trim()) {
      return d.image;
    }

    return null;
  };

  const isValidMerchant = (m: any) => {
    if (!m || typeof m !== "object") return false;

    return (
      m.name ||
      m.business_name ||
      m.phone ||
      m.phone_number ||
      m.address ||
      m.street_address ||
      m.google_address ||
      m.logo ||
      m.logo_url
    );
  };

  const normalizeMerchants = (merchantSrc: any) => {
    if (merchantSrc == null) return [];

    let arr: any[] = [];

    if (Array.isArray(merchantSrc)) arr = merchantSrc;
    else arr = [merchantSrc];

    return arr.filter(isValidMerchant);
  };

  return (
    <div style={{ width: "100%", overflowX: "hidden", overflowY: "auto", paddingBottom: "80px" }}>

{loading && rows.length === 0 && (
  <div style={{ padding: 8, fontSize: 12, color: "#6B7280" }}>
    Loading deals...
  </div>
)}

      {!loading && rows.length === 0 && (
        <div
          style={{
            padding: "16px 20px 8px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
            <img
              src="https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/map-pin.jpg"
              alt="No deals nearby"
              style={{ width: 95, height: "auto", flexShrink: 0 }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                No deals within {radiusKm} km
              </div>

              <button
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      () => window.location.reload(),
                      () => setLocationDenied(true)
                    );
                  }
                }}
                style={{
                  background: "#2563EB",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontWeight: 600,
                  width: "100%",
                  marginBottom: 10,
                  cursor: "pointer",
                }}
              >
                Enable Location
              </button>
            </div>
          </div>

          <div style={{ color: "#6B7280", marginBottom: 16 }}>
            {locationDenied
              ? "Location access is turned off. Enable location to see nearby deals."
              : "Let’s fix that in a moment."}
          </div>

          <div
            style={{
              background: "#F3F4F6",
              borderRadius: 16,
              padding: 18,
              textAlign: "left",
              maxWidth: 420,
              margin: "0 auto 12px",
            }}
          >
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 18 }}>📍</div>
              <div>
                <div style={{ fontWeight: 600 }}>Enable location</div>
                <div style={{ fontSize: 14, color: "#374151" }}>
                  Allow location access in your browser settings.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ fontSize: 18 }}>📏</div>
              <div>
                <div style={{ fontWeight: 600 }}>Expand your search</div>
                <div style={{ fontSize: 14, color: "#374151" }}>
                  Try a larger radius using the tabs above.
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 14, color: "#6B7280", textAlign: "center" }}>
            ⏰ New deals are added daily.
          </div>

          <div style={{ fontSize: 14, textAlign: "center" }}>
            Check again soon 👀
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div
          className="deals-list px-2"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingTop: 6,
            paddingBottom: 4,
            boxSizing: "border-box",
          }}
        >
          {rows.map((d) => {

            let merchantSrc: any = d.merchants;

            if (merchantSrc == null || (Array.isArray(merchantSrc) && merchantSrc.length === 0)) {
              merchantSrc = (d as any).merchant ?? null;
            }

            if (typeof merchantSrc === "string") {
              try { merchantSrc = JSON.parse(merchantSrc); } catch { merchantSrc = null; }
            }

            const merchants = normalizeMerchants(merchantSrc);

            const image = resolveDealImage(d);

            const dealForCard = {
              ...d,
              merchants,
            };

      

            return (
              <div key={d.id} style={{ width: "100%", display: "block" }}>
                <DealCard
                  deal={dealForCard}
                  onImageClick={() =>
                    handleImageClick(image ? { url: image, alt: d.title || "" } : null)
                  }
                  onNavigate={() => handleNavigate(`/deal/${d.id}`)}
                  toggleExpand={() => toggleDealExpansion(d.id)}
                  truncateAddress={truncateAddress}
                  truncateText={truncateText}
                />
              </div>
            );
          })}
        </div>
      )}

      {expandedDeal && expandedDealObj && (() => {

        let expMerchantSrc: any = expandedDealObj.merchants;

        if (expMerchantSrc == null || (Array.isArray(expMerchantSrc) && expMerchantSrc.length === 0)) {
          expMerchantSrc = (expandedDealObj as any).merchant ?? null;
        }

        if (typeof expMerchantSrc === "string") {
          try { expMerchantSrc = JSON.parse(expMerchantSrc); } catch { expMerchantSrc = null; }
        }

        const expMerchants = normalizeMerchants(expMerchantSrc);

        return (
          <ExpandedDealView
            deal={{
              ...expandedDealObj,
              merchants: expMerchants,
            }}
            onClose={() => setExpandedDeal(null)}
            onImageClick={(img) => handleImageClick(img)}
            onPhoneCall={(p) => handlePhoneCall(p)}
            onNavigate={onNavigate}
          />
        );
      })()}

    </div>
  );
}