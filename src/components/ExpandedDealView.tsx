import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, MapPin, Phone, Navigation, Globe2, Share2, Utensils } from "lucide-react";
import { Play } from "lucide-react";
import { shortenAddress } from "@/components/AddressUtils";
import { formatDateZA } from "@/lib/utils";

interface ExpandedDealViewProps {
  deal: any;
  onClose: () => void;
  onImageClick?: (...args: any[]) => void;
  onPhoneCall?: (phoneNumber?: string) => void;
  onNavigate?: (address: string, businessName: string) => void;
  isExpiringToday?: (date: string) => boolean;
  customerId?: string;
  hideActions?: boolean;
}

type DealMediaItem = {
  url: string;
  type: "image" | "video";
  poster?: string | null;
  slot?: number | null;
};

const PLACEHOLDER_IMAGE =
  "https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/deal-placeholder.jpg";

const WEEK_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_NORMALIZE_MAP: Record<string, string> = {
  mon: "Mon",
  monday: "Mon",
  tue: "Tue",
  tues: "Tue",
  tuesday: "Tue",
  wed: "Wed",
  wednesday: "Wed",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fri: "Fri",
  friday: "Fri",
  sat: "Sat",
  saturday: "Sat",
  sun: "Sun",
  sunday: "Sun",
};

const SWIPE_THRESHOLD = 40;
const THUMBNAIL_VISIBLE_COUNT = 3;
const THUMBNAIL_ROTATION_MS = 2500;

const toShortDay = (raw: string): string | null => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (DAY_NORMALIZE_MAP[s]) return DAY_NORMALIZE_MAP[s];
  const key = s.slice(0, 3);
  if (DAY_NORMALIZE_MAP[key]) return DAY_NORMALIZE_MAP[key];
  for (const k of Object.keys(DAY_NORMALIZE_MAP)) {
    if (s.startsWith(k)) return DAY_NORMALIZE_MAP[k];
  }
  return null;
};

const parseBool = (v: any) => {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  return !!v;
};

const normalizeUrl = (u?: string | null) => {
  if (!u) return "";
  return String(u).split("?")[0].split("#")[0].trim();
};

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".mp4") || clean.endsWith(".mov") || clean.endsWith(".webm") || clean.endsWith(".m4v");
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

const firstNonEmptyString = (...vals: any[]) => {
  for (const v of vals) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (s && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined") return s;
  }
  return "";
};

const isPlaceholderLike = (value?: string | null) => {
  const s = String(value || "").toLowerCase();
  return (
    s.includes("deal-placeholder") ||
    s.includes("merchant-logo") ||
    s.includes("/logo") ||
    s.endsWith("logo.jpg") ||
    s.endsWith("logo.png") ||
    s.endsWith("logo.jpeg") ||
    s.includes("brand")
  );
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

const extractRawUrls = (deal: any): string[] => {
  if (!deal) return [];

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

  if (Array.isArray(deal.images) && deal.images.some(Boolean)) {
    deal.images.forEach(pushRaw);
    return out;
  }

  if (typeof deal.images === "string") {
    const raw = deal.images.trim();
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

  pushRaw(deal.image_url);
  pushRaw(deal.image);

  return out;
};

const extractDealMedia = (deal: any): DealMediaItem[] => {
  if (!deal) return [];

  const urls = extractRawUrls(deal);
  if (!urls.length) return [];

  const slotMap = new Map<number, { video?: string; poster?: string; image?: string }>();
  const looseImages: string[] = [];

  urls.forEach((url) => {
    const meta = parseMediaMeta(url);
    const slot = meta?.slot;

    if (slot == null) {
      if (isImageUrl(url) || isVideoUrl(url)) looseImages.push(url);
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
      type: isVideoUrl(url) ? "video" : "image",
      poster: isVideoUrl(url) ? derivePosterUrl(url) || undefined : undefined,
      slot: null,
    });
  });

  return items;
};

const getRotatingThumbnailItems = (media: DealMediaItem[]) => {
  if (!media.length) return [];

  return media.map((item, index) => ({
    ...item,
    originalIndex: index,
  }));
};

const formatLatLngShort = (lat?: number, lng?: number) => {
  if (typeof lat !== "number" || typeof lng !== "number") return "";
  const lats = lat.toFixed(4);
  const lngs = lng.toFixed(4);
  return `Lat: ${lats}, Long: ${lngs}`;
};

const buildMapsQuery = (addressOrCoords: string) => {
  return encodeURIComponent(addressOrCoords);
};

const getRepeatDaysFromEntity = (entity: any): string[] => {
  if (!entity) return [];
  const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAY_SHORTS_LOOKUP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const normToken = (tok: any): string | null => {
    if (tok === null || tok === undefined) return null;
    if (typeof tok === "number") {
      if (tok >= 1 && tok <= 7) {
        const mapIndex = tok === 7 ? 0 : tok;
        return DAY_SHORTS_LOOKUP[mapIndex];
      }
      if (tok >= 0 && tok <= 6) return DAY_SHORTS_LOOKUP[tok];
      return null;
    }
    let s = String(tok).trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10);
      if (n >= 1 && n <= 7) {
        const mapIndex = n === 7 ? 0 : n;
        return DAY_SHORTS_LOOKUP[mapIndex];
      }
      if (n >= 0 && n <= 6) return DAY_SHORTS_LOOKUP[n];
    }
    const up = s.toLowerCase();
    if (up.startsWith("mon")) return "Mon";
    if (up.startsWith("tue")) return "Tue";
    if (up.startsWith("wed")) return "Wed";
    if (up.startsWith("thu")) return "Thu";
    if (up.startsWith("fri")) return "Fri";
    if (up.startsWith("sat")) return "Sat";
    if (up.startsWith("sun")) return "Sun";
    return null;
  };

  let tokens: any[] = [];

  if (Array.isArray(entity.repeat_days)) tokens = tokens.concat(entity.repeat_days);
  else if (entity.repeat && Array.isArray(entity.repeat.days)) tokens = tokens.concat(entity.repeat.days);
  else if (Array.isArray(entity.days)) tokens = tokens.concat(entity.days);

  if (typeof entity.repeat_days === "string" && entity.repeat_days.trim()) {
    try {
      const p = JSON.parse(entity.repeat_days);
      if (Array.isArray(p)) tokens = tokens.concat(p);
      else tokens = tokens.concat(String(entity.repeat_days).split(",").map((s: string) => s.trim()).filter(Boolean));
    } catch {
      tokens = tokens.concat(String(entity.repeat_days).split(",").map((s: string) => s.trim()).filter(Boolean));
    }
  } else if (typeof entity.days === "string" && entity.days.trim()) {
    try {
      const p = JSON.parse(entity.days);
      if (Array.isArray(p)) tokens = tokens.concat(p);
      else tokens = tokens.concat(String(entity.days).split(",").map((s: string) => s.trim()).filter(Boolean));
    } catch {
      tokens = tokens.concat(String(entity.days).split(",").map((s: string) => s.trim()).filter(Boolean));
    }
  }

  if (typeof entity.repeat_days === "object" && !Array.isArray(entity.repeat_days) && entity.repeat_days !== null) {
    tokens = tokens.concat(Object.keys(entity.repeat_days).filter((k) => parseBool((entity.repeat_days as any)[k])));
  }

  if (typeof entity === "object" && !Array.isArray(entity)) {
    Object.keys(entity).forEach((k) => {
      const short = toShortDay(k);
      if (short && parseBool((entity as any)[k])) tokens.push(short);
    });
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    const n = normToken(t);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  out.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  return out;
};

const ExpandedDealView: React.FC<ExpandedDealViewProps> = ({
  deal,
  onClose,
  onImageClick,
  onPhoneCall,
  onNavigate,
  hideActions = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);
  const [lightboxMediaIndex, setLightboxMediaIndex] = useState<number | null>(null);
  const [hasStartedLightboxVideo, setHasStartedLightboxVideo] = useState(false);
  const lightboxTouchStartX = useRef<number | null>(null);
  const lightboxTouchStartY = useRef<number | null>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement | null>(null);
  const location = useLocation();
  const isSharedDealPage = location.pathname.startsWith("/deals/");
  const effectiveHideActions = hideActions || isSharedDealPage;

  if (!deal) return null;

  const handleShare = () => {
    const dealId = deal?.id;
    if (!dealId) return;

    const shareUrl = `https://app.dinedeals.co.za/deals/${dealId}`;
    const shareText = deal?.title || "Check out this deal";

    const message = encodeURIComponent(`${shareText} ${shareUrl}`);
    const whatsappUrl = `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, "_blank");
  };

  const carouselMedia = extractDealMedia(deal);
  const rotatingMedia = getRotatingThumbnailItems(carouselMedia);
  const activeLightboxMedia = lightboxMediaIndex != null ? carouselMedia[lightboxMediaIndex] || null : null;

  const visibleThumbnailItems = (() => {
    if (!rotatingMedia.length) return [null, null, null];
    if (rotatingMedia.length <= THUMBNAIL_VISIBLE_COUNT) return rotatingMedia;

    return Array.from({ length: THUMBNAIL_VISIBLE_COUNT }, (_, offset) => {
      const nextIndex = (thumbnailStartIndex + offset) % rotatingMedia.length;
      return rotatingMedia[nextIndex];
    });
  })();

  useEffect(() => {
    setHasStartedLightboxVideo(false);
  }, [activeLightboxMedia?.url, activeLightboxMedia?.type]);

  useEffect(() => {
    if (!hasStartedLightboxVideo || activeLightboxMedia?.type !== "video" || !lightboxVideoRef.current) return;

    const video = lightboxVideoRef.current;

    const tryPlay = async () => {
      try {
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = false;
        video.currentTime = 0;

        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.then === "function") {
          await playAttempt;
        }
      } catch {
        window.open(activeLightboxMedia.url, "_blank");
      }
    };

    tryPlay();
  }, [hasStartedLightboxVideo, activeLightboxMedia?.url, activeLightboxMedia?.type]);

  useEffect(() => {
    setLightboxMediaIndex(null);
    setHasStartedLightboxVideo(false);
  }, [deal?.id, deal?.images, deal?.image_url, deal?.image]);

  useEffect(() => {
    setThumbnailStartIndex(0);
  }, [deal?.id, deal?.images, deal?.image_url, deal?.image]);

  useEffect(() => {
    if (carouselMedia.length <= THUMBNAIL_VISIBLE_COUNT) return;

    const intervalId = window.setInterval(() => {
      setThumbnailStartIndex((prev) => (prev + 1) % carouselMedia.length);
    }, THUMBNAIL_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [carouselMedia.length]);

  const handlePlayVideo = (e?: React.SyntheticEvent) => {
    e?.stopPropagation?.();

    if (activeLightboxMedia?.type !== "video") return;
    setHasStartedLightboxVideo(true);
  };

  const openMediaLightbox = (media?: DealMediaItem | null, idx?: number) => {
    if (!media?.url) return;

    const mediaIdx = carouselMedia.findIndex((item) => normalizeUrl(item.url) === normalizeUrl(media.url));
    const nextIndex = mediaIdx >= 0 ? mediaIdx : typeof idx === "number" ? idx : 0;

    setLightboxMediaIndex(nextIndex);

    if (media.type === "image" && onImageClick) {
      onImageClick(media.url, nextIndex);
    }
  };

  const closeMediaLightbox = () => {
    setLightboxMediaIndex(null);
    setHasStartedLightboxVideo(false);
  };

  const goToPrevMedia = () => {
    setLightboxMediaIndex((prev) => {
      if (prev == null || prev <= 0) return prev;
      return prev - 1;
    });
  };

  const goToNextMedia = () => {
    setLightboxMediaIndex((prev) => {
      if (prev == null || prev >= carouselMedia.length - 1) return prev;
      return prev + 1;
    });
  };

  const goToMedia = (nextIndex: number) => {
    if (!carouselMedia.length) return;
    const clamped = Math.max(0, Math.min(nextIndex, carouselMedia.length - 1));
    setLightboxMediaIndex(clamped);
  };

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    lightboxTouchStartX.current = t.clientX;
    lightboxTouchStartY.current = t.clientY;
  };

  const handleLightboxTouchEnd = (e: React.TouchEvent) => {
    const startX = lightboxTouchStartX.current;
    const startY = lightboxTouchStartY.current;

    lightboxTouchStartX.current = null;
    lightboxTouchStartY.current = null;

    if (startX == null || startY == null) return;

    const t = e.changedTouches[0];
    const deltaX = t.clientX - startX;
    const deltaY = t.clientY - startY;

    if (activeLightboxMedia?.type === "video") return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) goToNextMedia();
    if (deltaX > 0) goToPrevMedia();
  };

  let merchantSrc: any = deal.merchants;
  if (merchantSrc == null || (Array.isArray(merchantSrc) && merchantSrc.length === 0)) {
    merchantSrc = (deal as any).merchant ?? null;
  }
  if (typeof merchantSrc === "string") {
    try {
      merchantSrc = JSON.parse(merchantSrc);
    } catch {
      merchantSrc = null;
    }
  }

  const merchantRaw: Record<string, any> = (() => {
    if (merchantSrc == null) return {};
    if (Array.isArray(merchantSrc)) {
      const first = merchantSrc[0];
      if (first == null) return {};
      if (typeof first === "string") {
        try {
          return JSON.parse(first) || {};
        } catch {
          return {};
        }
      }
      if (Array.isArray(first)) return first[0] && typeof first[0] === "object" ? first[0] : {};
      return typeof first === "object" ? first : {};
    }
    return typeof merchantSrc === "object" ? merchantSrc : {};
  })();

  const merchant = {
    ...merchantRaw,
    logo: merchantRaw.logo || merchantRaw.logo_url || merchantRaw.logoUrl || null,
    logo_url: merchantRaw.logo_url || merchantRaw.logo || merchantRaw.logoUrl || null,
    address: merchantRaw.street_address || merchantRaw.address || null,
    street_address: merchantRaw.street_address || merchantRaw.address || null,
    phone: merchantRaw.phone_number || merchantRaw.phone || null,
    phone_number: merchantRaw.phone_number || merchantRaw.phone || null,
    website: merchantRaw.website || merchantRaw.web_address || merchantRaw.website_url || merchantRaw.url || null,
    web_address: merchantRaw.web_address || merchantRaw.website || merchantRaw.website_url || merchantRaw.url || null,
    whatsapp: merchantRaw.whatsapp_number || merchantRaw.whatsapp || null,
    whatsapp_number: merchantRaw.whatsapp_number || merchantRaw.whatsapp || null,
  };

  const merchantLogo = merchant?.logo_url || merchant?.logo || merchant?.logoUrl || null;
  const merchantName = merchant?.name || merchant?.business_name || "Merchant";

  const possibleAddressFields = [
    merchant?.street_address,
    merchant?.google_address,
    merchant?.formatted_address,
    merchant?.address_line1,
    merchant?.address,
    merchant?.street,
    merchant?.location?.address,
    merchant?.place?.formatted_address,
    merchant?.google_place?.formatted_address,
    merchant?.google_place_id ? merchant?.google_address : undefined,
    merchant?.address1,
    merchant?.address_line,
    merchant?.full_address,
  ];

  let streetAddress = "";
  for (const a of possibleAddressFields) {
    if (a && String(a).trim()) {
      streetAddress = String(a).trim();
      break;
    }
  }

  if (!streetAddress) {
    if (merchant?.google_place && typeof merchant.google_place === "object" && merchant.google_place.formatted_address) {
      streetAddress = String(merchant.google_place.formatted_address).trim();
    } else if (merchant?.place && typeof merchant.place === "object" && merchant.place.formatted_address) {
      streetAddress = String(merchant.place.formatted_address).trim();
    } else if (merchant?.additional_info && typeof merchant.additional_info === "object") {
      const ai = merchant.additional_info;
      const aiCandidates = [ai.formatted_address, ai.address, ai.street, ai.full_address];
      for (const x of aiCandidates) {
        if (x && String(x).trim()) {
          streetAddress = String(x).trim();
          break;
        }
      }
    }
  }

  const shortAddress = shortenAddress(streetAddress || merchant?.google_address || merchant?.address || merchant?.street || "");
  let addressToShow = streetAddress || shortAddress || "";
  const lat = typeof merchant?.latitude === "number" ? merchant.latitude : typeof merchant?.lat === "number" ? merchant.lat : undefined;
  const lng = typeof merchant?.longitude === "number" ? merchant.longitude : typeof merchant?.lng === "number" ? merchant.lng : undefined;
  if (!addressToShow && typeof lat === "number" && typeof lng === "number") {
    addressToShow = formatLatLngShort(lat, lng);
  }

  const addressTitle = addressToShow ? addressToShow : "Address not set";
  const addressMapQuery = streetAddress ? streetAddress : typeof lat === "number" && typeof lng === "number" ? `${lat},${lng}` : "";
  const showPrice = deal.price != null && deal.price !== "";

  const configuredShortDays = new Set<string>();
  const shortRepeatKeys: [string, string][] = [
    ["Mon", "repeat_mon"],
    ["Tue", "repeat_tue"],
    ["Wed", "repeat_wed"],
    ["Thu", "repeat_thu"],
    ["Fri", "repeat_fri"],
    ["Sat", "repeat_sat"],
    ["Sun", "repeat_sun"],
  ];

  shortRepeatKeys.forEach(([short, key]) => {
    if (parseBool((deal as any)[key]) || parseBool((merchant as any)[key])) {
      configuredShortDays.add(short);
    }
  });

  const daysFromDeal = getRepeatDaysFromEntity(deal);
  const daysFromMerchant = getRepeatDaysFromEntity(merchant);
  daysFromDeal.forEach((d) => configuredShortDays.add(d));
  daysFromMerchant.forEach((d) => configuredShortDays.add(d));

  const attributesSet = new Map<string, boolean>();
  const knownKeys = ["parking", "reservations", "wifi", "wi_fi", "free_parking", "has_reservations"];
  knownKeys.forEach((k) => {
    if (parseBool((merchant as any)[k])) attributesSet.set(humanizeKey(k), true);
  });

  function humanizeKey(k: string) {
    return String(k).replace(/[_-]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  const pushAttr = (label: string) => {
    const t = String(label || "").trim();
    if (!t) return;
    attributesSet.set(humanizeKey(t), true);
  };

  const rawAttrs = merchant.attributes || merchant.features || merchant.amenities || merchant.tags || merchant.additional_info;
  if (rawAttrs) {
    if (Array.isArray(rawAttrs)) {
      rawAttrs.forEach((a) => pushAttr(a));
    } else if (typeof rawAttrs === "string") {
      const trimmed = rawAttrs.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) parsed.forEach((a) => pushAttr(a));
        else if (typeof parsed === "object" && parsed !== null) {
          Object.keys(parsed).forEach((k) => {
            if (parseBool((parsed as any)[k])) pushAttr(k);
          });
        } else {
          trimmed.split(/[,|;]/).map((s) => s.trim()).forEach(pushAttr);
        }
      } catch {
        trimmed.split(/[,|;]/).map((s) => s.trim()).forEach(pushAttr);
      }
    } else if (typeof rawAttrs === "object") {
      Object.keys(rawAttrs).forEach((k) => {
        if (parseBool((rawAttrs as any)[k])) pushAttr(k);
      });
    }
  }

  const attributes = Array.from(attributesSet.keys());

  const cleanPhoneForLink = (p?: any) => {
    if (!p) return "";
    const s = String(p).trim();
    return s.replace(/[^\d+]/g, "");
  };

  const cleanPhoneForWhatsApp = (p?: any) => {
    if (!p) return "";
    return String(p).replace(/\D/g, "");
  };

  const formatDate = (d: any) => {
    return formatDateZA(d);
  };

  const phoneNumber = merchant?.phone || deal.phone || merchant?.mobile_number;

  const explicitWhatsAppNumber =
    merchant?.whatsapp_number ||
    merchant?.whatsapp ||
    merchant?.additional_info?.whatsapp_number ||
    merchant?.additional_info?.whatsapp ||
    null;

  const whatsappNumber = explicitWhatsAppNumber || phoneNumber || null;
  const phoneHref = phoneNumber ? `tel:${cleanPhoneForLink(phoneNumber)}` : undefined;
  const whatsappMessage = encodeURIComponent("Hi, I am contacting you from Dine Deals.");
  const whatsappDigits = whatsappNumber ? cleanPhoneForWhatsApp(whatsappNumber) : "";
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${whatsappMessage}` : undefined;

  const merchantLink = firstNonEmptyString(
    merchant?.website,
    merchant?.web_address,
    merchant?.website_url,
    merchant?.url,
    merchant?.link,
    merchant?.web,
    merchant?.domain,
    merchant?.additional_info?.website,
    merchant?.additional_info?.web_address,
    merchant?.additional_info?.website_url,
    merchant?.additional_info?.url,
    merchant?.additional_info?.link
  );

  const buildWebsiteHref = (raw: string) => {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    return `https://${s}`;
  };

  const websiteHref = merchantLink ? buildWebsiteHref(merchantLink) : "";

  return (
    <div
      className="expanded-deal-modal"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: window.innerWidth < 768 ? "center" : "flex-start",
        justifyContent: "center",
        zIndex: 2000,
        background: "rgba(0,0,0,0.4)",
        padding: 12,
        paddingTop: 40,
        overflowY: "auto",
        maxHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div
        className="modal-content relative bg-white rounded-lg shadow-lg"
        style={{
          width: "92%",
          maxWidth: 820,
          maxHeight: "100vh",
          overflowY: "auto",
          padding: 12,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {merchantLogo && (
              <img
                src={merchantLogo}
                alt={merchantName}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  objectFit: "cover",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                }}
              />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {merchantName}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "nowrap",
                  fontSize: 12,
                  color: "#4b5563",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Utensils size={14} color="#F59E0B" />
                  <span>{merchant?.category || "Restaurant"}</span>
                </div>

                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={14} className="text-green-500" />
                  <span>{deal?.distance_km?.toFixed?.(1) || ""} km</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={handleShare}
                style={{
                  background: "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                }}
              >
                <Share2 size={16} />
              </button>

              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#F3F4F6",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginTop: 10,
              lineHeight: 1.3,
              color: "#111827",
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              display: "block",
              width: "100%",
              maxWidth: "100%",
              paddingRight: 0,
            }}
          >
            {deal?.title || "Deal Offer"}
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          {(() => {
            const visible = visibleThumbnailItems;

            return (
              <div
                className="thumbnails-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))`,
                  gap: 8,
                  overflow: "hidden",
                  paddingBottom: 6,
                }}
              >
                {visible.map((item, idx) => {
                  const src = item?.url || null;
                  const isVideo = item?.type === "video";
                  const poster = item?.poster || undefined;
                  const imageSrc = isVideo ? poster || PLACEHOLDER_IMAGE : src || PLACEHOLDER_IMAGE;
                  const originalIndex = item && "originalIndex" in item ? item.originalIndex : idx;

                  return (
                    <div
                      key={`thumb-${item ? `${normalizeUrl(item.url)}-${originalIndex}` : idx}`}
                      onClick={() => {
                        if (!item) return;
                        openMediaLightbox(item, originalIndex);
                      }}
                      aria-label={`Open image ${originalIndex + 1}`}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: 10,
                        overflow: "hidden",
                        cursor: item ? "pointer" : "default",
                        boxSizing: "border-box",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                        position: "relative",
                        background: "#f8fafc",
                      }}
                    >
                      <img
                        src={imageSrc}
                        alt={deal.title || `image-${originalIndex + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                        }}
                        title={isVideo ? `Video ${originalIndex + 1}` : `Image ${originalIndex + 1}`}
                      />

                      {src && isVideo && (
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            left: 12,
                            bottom: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(0,0,0,0.55)",
                            color: "#fff",
                            borderRadius: 9999,
                            padding: "6px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            pointerEvents: "none",
                          }}
                        >
                          <Play size={14} color="#ffffff" />
                          <span>Video</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {visibleThumbnailItems.length > 0 && (
          <div
            style={{
              marginBottom: 10,
              textAlign: "center",
              fontSize: 12,
              color: "#6B7280",
              lineHeight: 1.4,
            }}
          >
            Tap image to expand
          </div>
        )}

        {configuredShortDays.size > 0 && (
          <div
            style={{
              marginBottom: 14,
              fontSize: 12,
              color: "#374151",
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ fontWeight: 700, color: "#111827" }}>Valid:</span>{" "}
            {WEEK_ORDER.filter((day) => configuredShortDays.has(day)).join(" • ")}
          </div>
        )}

        <div
          style={{
            marginBottom: 8,
            width: "100%",
            maxWidth: "100%",
            display: "block",
          }}
        >
          <div
            style={{
              color: "#374151",
              fontSize: 14,
              marginBottom: 6,
              display: "-webkit-box",
              WebkitLineClamp: expanded ? "unset" : 2,
              WebkitBoxOrient: "vertical",
              overflow: expanded ? "visible" : "hidden",
              lineHeight: "20px",
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              width: "100%",
              maxWidth: "100%",
            }}
          >
            {deal.description}
          </div>

          {deal.description && deal.description.length > 100 && (
            <span
              onClick={() => setExpanded(!expanded)}
              style={{
                color: "#16A34A",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {expanded ? "Show less" : "Read more"}
            </span>
          )}
        </div>

        {attributes && attributes.length > 0 && (
          <div
            style={{
              position: "relative",
              zIndex: 5,
              background: "#fff",
              display: "flex",
              gap: 14,
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            {attributes.map((label, idx) => (
              <div key={`attr-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          {showPrice && <div style={{ fontWeight: 800, color: "#dc2626", fontSize: 32 }}>{`R${deal.price}`}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 13 }}>
            <Calendar style={{ width: 22, height: 22, color: "#DC2626" }} />
            <span>
              {deal.valid_until ? `Expires: ${formatDate(deal.valid_until)}` : deal.ends_at ? `Expires: ${formatDate(deal.ends_at)}` : "No expiry"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 4,
            justifyContent: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          ></div>

          {merchantLink && websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#2563EB",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <Globe2 size={16} />
              {merchantLink.replace(/^https?:\/\//i, "").trim()}
            </a>
          )}
        </div>

        {!effectiveHideActions && (
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            {phoneHref && (
              <a
                href={phoneHref}
                aria-label="Call merchant"
                onClick={() => {
                  if (typeof onPhoneCall === "function") {
                    try {
                      onPhoneCall(phoneNumber);
                    } catch {}
                  }
                }}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  background: "#DC2626",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  border: "none",
                  flex: 1,
                  height: 50,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                  transition: "transform 0.08s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Phone size={22} />
              </a>
            )}

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Message on WhatsApp"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  background: "#16A34A",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  border: "none",
                  flex: 1,
                  height: 50,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                  transition: "transform 0.08s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path d="M12 2C6.48 2 2 6.03 2 10.97c0 2.13.86 4.08 2.29 5.62L3 22l5.61-1.46c1.45.78 3.09 1.19 4.39 1.19 5.52 0 10-4.03 10-8.97S17.52 2 12 2zm0 16.36c-1.22 0-2.41-.33-3.42-.95l-.24-.14-3.33.87.89-3.15-.16-.25c-.78-1.19-1.2-2.55-1.2-3.97 0-3.98 3.58-7.22 7.99-7.22s7.99 3.24 7.99 7.22-3.58 7.22-7.99 7.22zm4.39-5.44c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12s-.62.78-.76.94c-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                </svg>
              </a>
            )}

            <button
              onClick={() =>
                onNavigate
                  ? onNavigate(streetAddress || addressTitle, merchantName)
                  : (window.location.href = `geo:0,0?q=${buildMapsQuery(addressMapQuery || streetAddress || addressTitle)}`)
              }
              aria-label="Open in maps"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                background: "#D97706",
                color: "#FFFFFF",
                border: "none",
                flex: 1,
                height: 50,
                boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                transition: "transform 0.08s ease",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Navigation size={22} />
            </button>
          </div>
        )}

        {activeLightboxMedia && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 3000,
              background: "#000",
              padding: 12,
              boxSizing: "border-box",
            }}
            onClick={closeMediaLightbox}
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeMediaLightbox();
              }}
              aria-label="Close media carousel"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#FFFFFF",
                color: "#111827",
                fontSize: 20,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #E5E7EB",
                cursor: "pointer",
                zIndex: 4000,
              }}
            >
              ×
            </button>

            {carouselMedia.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous media"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevMedia();
                  }}
                  disabled={lightboxMediaIndex === 0}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: "none",
                    background: lightboxMediaIndex === 0 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)",
                    color: "#111827",
                    fontSize: 20,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: lightboxMediaIndex === 0 ? "default" : "pointer",
                    zIndex: 4000,
                  }}
                >
                  ‹
                </button>

                <button
                  type="button"
                  aria-label="Next media"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextMedia();
                  }}
                  disabled={lightboxMediaIndex === carouselMedia.length - 1}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: "none",
                    background:
                      lightboxMediaIndex === carouselMedia.length - 1 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)",
                    color: "#111827",
                    fontSize: 20,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: lightboxMediaIndex === carouselMedia.length - 1 ? "default" : "pointer",
                    zIndex: 4000,
                  }}
                >
                  ›
                </button>
              </>
            )}

            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {activeLightboxMedia.type === "video" ? (
                <div
                  style={{
                    maxWidth: "100%",
                    maxHeight: "calc(100% - 40px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {!hasStartedLightboxVideo ? (
                    <>
                      <button
                        type="button"
                        onClick={handlePlayVideo}
                        style={{
                          border: "none",
                          padding: 0,
                          background: "transparent",
                          cursor: "pointer",
                          display: "block",
                          width: "100%",
                          maxWidth: "100%",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                          }}
                        >
                          <img
                            src={activeLightboxMedia.poster || PLACEHOLDER_IMAGE}
                            alt="Deal video poster"
                            style={{ maxWidth: "100%", maxHeight: "calc(100% - 100px)", objectFit: "contain", background: "#000" }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                            }}
                          />
                          <div
                            aria-hidden
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                              width: 84,
                              height: 84,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.96)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
                            }}
                          >
                            <Play size={32} color="#111827" fill="#111827" />
                          </div>
                        </div>
                      </button>
                    </>
                  ) : (
                    <video
                      key={`${activeLightboxMedia.url}-playing`}
                      ref={lightboxVideoRef}
                      src={activeLightboxMedia.url}
                      poster={activeLightboxMedia.poster || undefined}
                      controls
                      autoPlay
                      playsInline
                      preload="auto"
                      style={{ maxWidth: "100%", maxHeight: "calc(100% - 100px)", objectFit: "contain", background: "#000" }}
                    />
                  )}
                </div>
              ) : (
                <img
                  src={activeLightboxMedia.url || PLACEHOLDER_IMAGE}
                  alt="Deal image"
                  style={{ maxWidth: "100%", maxHeight: "calc(100% - 40px)", objectFit: "contain" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                  }}
                />
              )}

              {carouselMedia.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {carouselMedia.map((item, idx) => {
                    const active = idx === lightboxMediaIndex;
                    return (
                      <button
                        key={`lightbox-dot-${idx}`}
                        type="button"
                        aria-label={`Show media ${idx + 1}`}
                        onClick={() => goToMedia(idx)}
                        style={{
                          width: active ? 18 : 8,
                          height: 8,
                          borderRadius: 9999,
                          border: "none",
                          background: active ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                          padding: 0,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedDealView;
