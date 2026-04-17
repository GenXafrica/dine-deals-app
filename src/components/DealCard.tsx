import React, { useRef, useEffect, useState } from "react";
import { Heart, Info, Star, ThumbsUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateZA } from "@/lib/utils";

type Merchant = {
  id?: string;
  name?: string | null;
  category?: string | null;
  logo?: string | null;
  logo_url?: string | null;
  logoUrl?: string | null;
  phone_number?: string | null;
  phone?: string | null;
  web_address?: string | null;
  website?: string | null;
  street_address?: string | null;
  address?: string | null;
  whatsapp_number?: string | null;
  whatsapp?: string | null;
  subscription_plan_id?: string | null;
  [k: string]: any;
};

type Deal = {
  id: string;
  title?: string;
  description?: string;
  price?: number | null;
  images?: any;
  image?: string | null;
  image_url?: string | null;
  merchants?: Merchant[] | Merchant | null;
  merchant_id?: string;
  valid_until?: string | null;
  [k: string]: any;
};

type DealMediaItem = {
  url: string;
  type: "image" | "video";
  poster?: string | null;
  slot?: number | null;
};

type ReactionType = "like" | "love" | null;

interface Props {
  d?: Deal | null;
  deal?: Deal | null;
  expandedDeal?: string | null;
  expanded?: boolean;
  toggleDealExpansion?: (id: string | null) => void;
  onClick?: () => void;
  toggleExpand?: (id?: string | null) => void;
}

const LOGO_SIZE = 48;
const GAP = 8;
const CARD_PADDING = 6;
const FOOTER_HEIGHT = 44;

const FAVOURITE_PLAN_IDS = [
  "fcdacae8-3dd6-4d9a-bdf3-4639da9a9c6b",
  "a89acdb6-6aed-4211-a889-fead4ab6197f",
];

const PLACEHOLDER_IMAGE =
  "https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/deal-placeholder.jpg";

const normalizeUrl = (u?: string | null) => {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  return s.split("?")[0].split("#")[0];
};

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".m4v")
  );
};

const isImageUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".avif")
  );
};

const firstNonEmptyString = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const s = value.trim();
    if (s) return s;
  }
  return "";
};

const isPlaceholderLike = (value?: string | null) => {
  const s = String(value || "").toLowerCase();
  return s.includes("deal-placeholder");
};

const getFileName = (url?: string | null) => {
  const clean = normalizeUrl(url);
  if (!clean) return "";
  return clean.split("/").pop() || "";
};

const parseMediaMeta = (url?: string | null) => {
  const filename = getFileName(url);
  if (!filename) return null;

  const posterMatch = filename.match(/^(.*)_(\d+)_(\d+)\.poster\.(jpg|jpeg|png|webp)$/i);
  if (posterMatch) {
    return {
      slot: Number(posterMatch[2]),
      isPoster: true,
    };
  }

  const standardMatch = filename.match(/^(.*)_(\d+)_(\d+)\.([a-z0-9]+)$/i);
  if (standardMatch) {
    return {
      slot: Number(standardMatch[2]),
      isPoster: false,
    };
  }

  return {
    slot: null as number | null,
    isPoster: false,
  };
};

const derivePosterUrl = (videoUrl?: string | null) => {
  const clean = normalizeUrl(videoUrl);
  if (!clean || !isVideoUrl(clean)) return "";
  return clean.replace(/\.(mp4|mov|webm|m4v)$/i, ".poster.jpg");
};

const extractRawUrls = (d?: Deal | null): string[] => {
  if (!d) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  const pushRaw = (raw?: any) => {
    if (!raw) return;

    if (typeof raw === "string") {
      const url = raw.trim();
      if (!url || isPlaceholderLike(url)) return;
      const key = normalizeUrl(url);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(url);
      return;
    }

    if (typeof raw === "object") {
      const url = firstNonEmptyString(
        raw.url,
        raw.src,
        raw.image_url,
        raw.imageUrl,
        raw.video_url,
        raw.videoUrl,
        raw.file_url,
        raw.fileUrl,
        raw.path,
        raw.media_url,
        raw.mediaUrl
      );

      if (!url || isPlaceholderLike(url)) return;
      const key = normalizeUrl(url);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(url);
    }
  };

  const parseMaybeJsonArray = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        parsed.forEach(pushRaw);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  if (Array.isArray(d.images) && d.images.some(Boolean)) {
    d.images.forEach(pushRaw);
    return out;
  }

  if (typeof d.images === "string") {
    const raw = d.images.trim();
    if (raw) {
      const parsed = parseMaybeJsonArray(raw);
      if (parsed && out.length > 0) return out;

      if (!parsed) {
        raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach(pushRaw);

        if (out.length > 0) return out;
      }
    }
  }

  pushRaw(d.image);
  pushRaw(d.image_url);

  return out;
};

const buildDealMedia = (d?: Deal | null): DealMediaItem[] => {
  const urls = extractRawUrls(d);
  if (!urls.length) return [];

  const slotMap = new Map<number, { video?: string; poster?: string; image?: string }>();
  const looseImages: string[] = [];

  urls.forEach((url) => {
    const meta = parseMediaMeta(url);
    const slot = meta?.slot;

    if (slot == null) {
      if (isImageUrl(url)) looseImages.push(url);
      return;
    }

    if (!slotMap.has(slot)) slotMap.set(slot, {});

    const bucket = slotMap.get(slot)!;

    if (isVideoUrl(url)) {
      bucket.video = url;
      return;
    }

    if (isImageUrl(url)) {
      if (meta?.isPoster) {
        bucket.poster = url;
      } else if (!bucket.image) {
        bucket.image = url;
      }
    }
  });

  const items: DealMediaItem[] = [];

  Array.from(slotMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([slot, bucket]) => {
      if (bucket.video) {
        items.push({
          url: bucket.video,
          type: "video",
          poster: bucket.poster || bucket.image || derivePosterUrl(bucket.video) || undefined,
          slot,
        });
      } else if (bucket.image) {
        items.push({
          url: bucket.image,
          type: "image",
          slot,
        });
      }
    });

  looseImages.forEach((url) => {
    items.push({
      url,
      type: "image",
      slot: null,
    });
  });

  return items;
};

function formatPrice(price: number | null) {
  if (price == null) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "ZAR",
      currencyDisplay: "narrowSymbol",
    }).format(price);
  } catch {
    return `R${price}`;
  }
}

export default function DealCard(props: Props) {
  const d: Deal | null = props.d ?? props.deal ?? null;
  const articleRef = useRef<HTMLElement | null>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [canFavourite, setCanFavourite] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [loveCount, setLoveCount] = useState(0);
  const [userReaction, setUserReaction] = useState<ReactionType>(null);
  const [engagementLoading, setEngagementLoading] = useState(false);

  if (!d) return null;

  const merchant: Merchant =
    Array.isArray(d.merchants) && d.merchants.length > 0
      ? d.merchants[0]
      : (d.merchants as Merchant) ?? {};

  const merchantId =
    d.merchant_id ??
    (Array.isArray(d.merchants) ? d.merchants[0]?.id : (d.merchants as any)?.id) ??
    null;

  const merchantName = merchant?.name || "Restaurant";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyHighlight = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const dealId = hash.replace("#deal-", "");

      if (dealId === d.id) {
        setIsHighlighted(true);

        setTimeout(() => {
          articleRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 120);
      }
    };

    applyHighlight();

    window.addEventListener("hashchange", applyHighlight);

    return () => {
      window.removeEventListener("hashchange", applyHighlight);
    };
  }, [d.id]);

  useEffect(() => {
    const checkPlan = async () => {
      if (!merchantId) return;

      const { data } = await supabase
        .from("merchants")
        .select("subscription_plan_id")
        .eq("id", merchantId)
        .single();

      if (data?.subscription_plan_id) {
        if (FAVOURITE_PLAN_IDS.includes(data.subscription_plan_id)) {
          setCanFavourite(true);
        }
      }
    };

    checkPlan();
  }, [merchantId]);

  useEffect(() => {
    const loadCustomerId = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        setCustomerId(null);
        return;
      }

      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", userId)
        .single();

      setCustomerId(customer?.id ?? null);
    };

    loadCustomerId();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadCustomerId();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const checkFavourite = async () => {
      if (!merchantId || !canFavourite) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) return;

      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!customer) return;

      const { data } = await supabase
        .from("customer_favourites")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("merchant_id", merchantId)
        .maybeSingle();

      setIsFavourite(Boolean(data));
    };

    checkFavourite();
  }, [merchantId, canFavourite]);

  useEffect(() => {
    const loadEngagement = async () => {
      if (!d.id) return;

      const { data: countsData } = await supabase.rpc("get_deal_engagement_counts", {
        p_deal_id: d.id,
      });

      const countsRow = Array.isArray(countsData) ? countsData[0] : countsData;
setLikeCount(Number(countsRow?.like_count ?? 0));
setLoveCount(Number(countsRow?.love_count ?? 0));

      if (!customerId) {
        setUserReaction(null);
        return;
      }

      const { data: reactionRow } = await supabase
        .from("customer_engagements")
        .select("reaction_type")
        .eq("customer_id", customerId)
        .eq("deal_id", d.id)
        .maybeSingle();

      const reaction = reactionRow?.reaction_type;
      setUserReaction(reaction === "like" || reaction === "love" ? reaction : null);
    };

    loadEngagement();
  }, [d.id, customerId]);

  const toggleFavourite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!merchantId) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) return;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!customer) return;

    const cid = customer.id;

    if (isFavourite) {
      await supabase
        .from("customer_favourites")
        .delete()
        .eq("customer_id", cid)
        .eq("merchant_id", merchantId);

      setIsFavourite(false);
      window.location.reload();
    } else {
      await supabase.from("customer_favourites").insert({
        customer_id: cid,
        merchant_id: merchantId,
      });

      setIsFavourite(true);
    }
  };

  const handleReaction = async (
    e: React.MouseEvent,
    nextReaction: Exclude<ReactionType, null>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!d.id || !customerId || engagementLoading) return;

    setEngagementLoading(true);

    try {
      if (userReaction === nextReaction) {
        await supabase
          .from("customer_engagements")
          .delete()
          .eq("customer_id", customerId)
          .eq("deal_id", d.id);

        setUserReaction(null);
      } else {
const payload = {
  customer_id: customerId,
  deal_id: d.id,
  reaction_type: nextReaction,
};

        if (userReaction) {
const { error } = await supabase
  .from("customer_engagements")
  .update(payload)
  .eq("customer_id", customerId)
  .eq("deal_id", d.id);

if (error) {
  console.error("ENGAGEMENT ERROR:", error);
}
        } else {
const { error } = await supabase
  .from("customer_engagements")
  .upsert(payload, { onConflict: "customer_id,deal_id" });

if (error) {
  console.error("ENGAGEMENT ERROR:", error);
}
        }

        setUserReaction(nextReaction);
      }

      const { data: countsData } = await supabase.rpc("get_deal_engagement_counts", {
        p_deal_id: d.id,
      });

      const countsRow = Array.isArray(countsData) ? countsData[0] : countsData;
setLikeCount(Number(countsRow?.like_count ?? 0));
setLoveCount(Number(countsRow?.love_count ?? 0));
    } finally {
      setEngagementLoading(false);
    }
  };

  const merchantLogo = merchant?.logo_url || merchant?.logo || merchant?.logoUrl || null;
  const merchantLogoNorm = normalizeUrl(merchantLogo);
  const dealMediaRaw = buildDealMedia(d);

  const dealMedia = dealMediaRaw.filter((item) => {
    const itemNorm = normalizeUrl(item.url);
    if (!itemNorm) return false;
    if (merchantLogoNorm && itemNorm === merchantLogoNorm) return false;
    return true;
  });

  const displayedThumbs = (() => {
    const arr = dealMedia.slice(0, 3);
    const result: Array<DealMediaItem | null> = [...arr];
    while (result.length < 3) result.push(null);
    return result;
  })();

  const callToggle = (id?: string | null) => {
    if (typeof props.toggleExpand === "function") {
      props.toggleExpand(id ?? null);
      return;
    }

    if (typeof props.toggleDealExpansion === "function") {
      props.toggleDealExpansion(id ?? null);
      return;
    }
  };

  const expiryDate = d.valid_until ? formatDateZA(d.valid_until) : null;

  return (
    <article
      id={`deal-${d.id}`}
      ref={(el) => {
        if (el) articleRef.current = el as HTMLElement;
      }}
      data-test="deal-card"
      style={{
        backgroundColor: "#F3F4F6",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        padding: CARD_PADDING,
        cursor: "pointer",
        borderRadius: 8,
        border: isHighlighted ? "2px solid #dc2626" : "1px solid rgba(0,0,0,0.06)",
        boxShadow: isHighlighted ? "0 0 0 3px rgba(220,38,38,0.25)" : "none",
      }}
      onClick={() => callToggle(d.id)}
    >
      <div style={{ display: "flex", gap: GAP, alignItems: "center" }}>
        <div
          style={{
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: 8,
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: "#ffffff",
          }}
        >
          {merchantLogo && (
            <img
              src={merchantLogo}
              alt="merchant-logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.onerror = null;
                t.src = PLACEHOLDER_IMAGE;
              }}
            />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{merchantName}</div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              lineHeight: "1.2",
            }}
          >
            {d.title}
          </div>

          {expiryDate && (
            <div style={{ fontSize: 12, color: "#6B7280" }}>Ends on {expiryDate}</div>
          )}
        </div>

        {canFavourite && (
          <button
            onClick={toggleFavourite}
            aria-label="Favourite merchant"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 6,
            }}
          >
            {isFavourite ? (
              <Star size={22} color="#dc2626" fill="#dc2626" strokeWidth={0} />
            ) : (
              <Star size={22} color="#9CA3AF" fill="none" />
            )}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {displayedThumbs.map((item, i) => {
          const src = item?.url || null;
          const isVideo = item?.type === "video";
          const poster = item?.poster || undefined;
          const imageSrc = isVideo ? poster || PLACEHOLDER_IMAGE : src || PLACEHOLDER_IMAGE;

          return (
            <div
              key={i}
              style={{
                borderRadius: 8,
                overflow: "hidden",
                backgroundColor: "#f8fafc",
                position: "relative",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: "100%",
                  paddingBottom: "100%",
                  position: "relative",
                }}
              >
                <img
                  src={imageSrc}
                  alt={`deal-thumb-${i}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.onerror = null;
                    t.src = PLACEHOLDER_IMAGE;
                  }}
                />

                {isVideo && src && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9999,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7-11-7z" fill="#fff" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 6,
          height: FOOTER_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
            flex: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              color: "#dc2626",
              fontWeight: 800,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {formatPrice(d.price ?? null)}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              aria-label="Like deal"
              onClick={(e) => handleReaction(e, "like")}
              disabled={!customerId || engagementLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: !customerId || engagementLoading ? "default" : "pointer",
                opacity: !customerId ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              <ThumbsUp
                size={16}
                color={userReaction === "like" ? "#16A34A" : "#6B7280"}
                fill={userReaction === "like" ? "#16A34A" : "none"}
                strokeWidth={1.8}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: userReaction === "like" ? "#16A34A" : "#4B5563",
                  lineHeight: 1,
                }}
              >
                {likeCount}
              </span>
            </button>

            <button
              type="button"
              aria-label="Love deal"
              onClick={(e) => handleReaction(e, "love")}
              disabled={!customerId || engagementLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: !customerId || engagementLoading ? "default" : "pointer",
                opacity: !customerId ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              <Heart
                size={16}
                color={userReaction === "love" ? "#dc2626" : "#6B7280"}
                fill={userReaction === "love" ? "#dc2626" : "none"}
                strokeWidth={1.8}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: userReaction === "love" ? "#dc2626" : "#4B5563",
                  lineHeight: 1,
                }}
              >
                {loveCount}
              </span>
            </button>
          </div>
        </div>

        <button
          aria-label="Info"
          style={{
            width: 56,
            height: 56,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            padding: 8,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Info size={28} style={{ color: "#2563EB" }} />
        </button>
      </div>
    </article>
  );
}
