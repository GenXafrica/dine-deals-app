// src/components/EditDealDialog.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, X as IconX, Pencil, Plus, Globe, Phone, MessageCircle, Send, MapPin, Share2, UtensilsCrossed } from 'lucide-react';
import { DealThumbnailUpload } from './DealThumbnailUpload';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Deal {
  id?: string;
  title: string;
  description: string;
  valid_until?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  images?: string[] | null;
  image?: string | null;
  price?: number | null;
  price_type?: string | null;
  price_text?: string | null;
  is_active: boolean;
  repeat?: any;
}

interface EditDealDialogProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDealUpdated: () => void;
}

const DEAL_TITLE_LIMIT = 50;
const DEAL_DESCRIPTION_LIMIT = 200;

const STARTER_MEDIA_LIMIT = 3;
const MAIN_COURSE_MEDIA_LIMIT = 5;
const CHEFS_TABLE_MEDIA_LIMIT = 7;
const PREVIEW_ROTATION_INTERVAL_MS = 2500;

const PLACEHOLDER_IMAGE =
  "https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/deal-placeholder.jpg";

const sanitizeAndTrim = (value: string, limit: number) => {
  const sanitized = value.replace(/[^\x20-\x7E]/g, '');
  return sanitized.slice(0, limit);
};

const toStartOfDayISO = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
};

const toEndOfDayISO = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
};

const formatPriceForDisplay = (p: any) => {
  if (p === null || p === undefined || p === '') return '';
  const n = typeof p === 'number' ? p : parseFloat(String(p));
  if (Number.isNaN(n)) return '';
  return `R${n.toFixed(2)}`;
};

const parseNumericFromDisplay = (s: string | null | undefined) => {
  if (!s) return null;
  const numeric = String(s).replace(/[^0-9.]/g, '');
  const n = numeric ? parseFloat(numeric) : null;
  return n === null || Number.isNaN(n) ? null : n;
};

const toDateInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatExpiryDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Simple helper to detect video urls (mp4/mov)
const isVideoUrl = (url: string) => {
  if (!url) return false;
  return /\.(mp4|mov)(\?|$)/i.test(url);
};

// derive poster url from video url: replace extension with .poster.jpg
const derivePosterUrl = (videoUrl: string) => {
  if (!videoUrl) return '';
  return videoUrl.replace(/\.[^/.]+(\?.*)?$/, '.poster.jpg');
};

const getMediaLimitFromFeatures = (features?: any): number | null => {
  if (!Array.isArray(features)) return null;

  for (const feature of features) {
    if (typeof feature !== 'string') continue;
    const match = feature.match(/up to\s+(\d+)\s+media files?/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  return null;
};

const getMediaLimitForPlan = (planName?: string | null, features?: any) => {
  const featureLimit = getMediaLimitFromFeatures(features);
  if (featureLimit) return featureLimit;

  if (!planName) return STARTER_MEDIA_LIMIT;
  const normalized = planName.toLowerCase();
  if (normalized.includes('chef')) return CHEFS_TABLE_MEDIA_LIMIT;
  if (normalized.includes('main')) return MAIN_COURSE_MEDIA_LIMIT;
  return STARTER_MEDIA_LIMIT;
};

export const EditDealDialog: React.FC<EditDealDialogProps> = ({
  deal,
  open,
  onOpenChange,
  onDealUpdated,
}) => {
  const navigate = useNavigate();

  const [edited, setEdited] = useState({
    title: '',
    description: '',
    priceMode: 'empty' as 'empty' | 'amount' | 'text',
    displayPrice: '',
    price: null as number | null,
    priceText: '',
    starts_at: '' as string,
    ends_at: '' as string,
    images: [] as string[],
    repeat: null as any | null,
  });
  const [saving, setSaving] = useState(false);
  const [currentDealId, setCurrentDealId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>('Starter Course');
  const [maxMediaItems, setMaxMediaItems] = useState<number>(STARTER_MEDIA_LIMIT);
  const [merchantAddressText, setMerchantAddressText] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('Restaurant name');
  const [merchantLogo, setMerchantLogo] = useState<string>('');
  const [merchantCategory, setMerchantCategory] = useState<string>('Restaurant');
  const [merchantWebsiteText, setMerchantWebsiteText] = useState<string>('');

  // full-screen player state (merchant preview box only)
  // ref for inner scroll container
  const innerRef = useRef<HTMLDivElement | null>(null);

  // dynamic bottom padding so dialog content scrolls above fixed footer
  const [bottomPaddingPx, setBottomPaddingPx] = useState<number>(48);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);

  useEffect(() => {
    const updatePadding = () => {
      try {
        const portal = document.getElementById('dd-footer-portal');
        const h = portal ? Math.round(portal.getBoundingClientRect().height) : 0;
        const padding = h > 0 ? Math.max(h + 12, 48) : 48;
        setBottomPaddingPx(padding);
      } catch {
        setBottomPaddingPx(48);
      }
    };

    updatePadding();

    let obs: MutationObserver | null = null;
    try {
      obs = new MutationObserver(() => updatePadding());
      obs.observe(document.body, { childList: true, subtree: true });
    } catch {}

    window.addEventListener('resize', updatePadding);

    return () => {
      try {
        if (obs) obs.disconnect();
      } catch {}
      window.removeEventListener('resize', updatePadding);
    };
  }, []);

  // prevent background scroll while modal open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow || '';
      };
    }
  }, [open]);

  // reset inner scroll to top when opened
  useEffect(() => {
    if (open && innerRef.current) {
      setTimeout(() => {
        try {
          innerRef.current!.scrollTop = 0;
        } catch {}
      }, 10);
    }
  }, [open]);

  // --- Repeat helpers ---
  const getUserTimezone = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz || 'Africa/Johannesburg';
    } catch {
      return 'Africa/Johannesburg';
    }
  };

  const WEEK_DAYS = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  const ensureRepeatShape = (base: any) => {
    if (!base || typeof base !== 'object') {
      return { days: [], time_ranges: [], timezone: getUserTimezone() };
    }
    return {
      days: Array.isArray(base.days) ? base.days : [],
      time_ranges: Array.isArray(base.time_ranges)
        ? base.time_ranges.map((tr: any) => ({
            start: tr?.start ?? '09:00',
            end: tr?.end ?? '17:00',
          }))
        : [],
      timezone: base.timezone ?? getUserTimezone(),
    };
  };

  const ensureTimezoneOnRepeat = () => {
    setEdited(prev => {
      const cur = ensureRepeatShape(prev.repeat);
      if (!cur.timezone) {
        return { ...prev, repeat: { ...cur, timezone: getUserTimezone() } };
      }
      return prev;
    });
  };

  const toggleDay = (dayKey: string) => {
    setEdited(prev => {
      const current = ensureRepeatShape(prev.repeat);
      const daysSet = new Set(current.days);
      if (daysSet.has(dayKey)) daysSet.delete(dayKey);
      else daysSet.add(dayKey);
      const updated = { ...current, days: Array.from(daysSet) };
      return { ...prev, repeat: updated };
    });
  };

  const addTimeRange = () => {
    setEdited(prev => {
      const current = ensureRepeatShape(prev.repeat);
      return {
        ...prev,
        repeat: {
          ...current,
          time_ranges: [...current.time_ranges, { start: '09:00', end: '17:00' }],
        },
      };
    });
  };

  const removeTimeRange = (idx: number) => {
    setEdited(prev => {
      const current = ensureRepeatShape(prev.repeat);
      const tr = current.time_ranges.filter((_: any, i: number) => i !== idx);
      return { ...prev, repeat: { ...current, time_ranges: tr } };
    });
  };

  const updateTimeRange = (idx: number, field: 'start' | 'end', value: string) => {
    setEdited(prev => {
      const current = ensureRepeatShape(prev.repeat);
      const tr = current.time_ranges.map((r: any, i: number) =>
        i === idx ? { ...r, [field]: value } : r
      );
      return { ...prev, repeat: { ...current, time_ranges: tr } };
    });
  };

  const buildRepeatScheduleForDb = (repeat: any) => {
    const r = ensureRepeatShape(repeat);
    if (!r.days || r.days.length === 0) return [];

    const dayMap: Record<string, number> = {
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
      sun: 7,
    };

    const schedule: {
      day_of_week: number;
      start_time: string | null;
      end_time: string | null;
    }[] = [];

    const hasRanges = r.time_ranges && r.time_ranges.length > 0;

    if (!hasRanges) {
      r.days.forEach((dayKey: string) => {
        const dow = dayMap[dayKey];
        if (!dow) return;
        schedule.push({
          day_of_week: dow,
          start_time: null,
          end_time: null,
        });
      });
    } else {
      r.days.forEach((dayKey: string) => {
        const dow = dayMap[dayKey];
        if (!dow) return;
        r.time_ranges.forEach((tr: any) => {
          const start = tr?.start || null;
          const end = tr?.end || null;
          schedule.push({
            day_of_week: dow,
            start_time: start,
            end_time: end,
          });
        });
      });
    }

    return schedule;
  };

  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const openRepeatModal = () => {
    ensureTimezoneOnRepeat();
    setRepeatModalOpen(true);
  };
  const closeRepeatModal = () => setRepeatModalOpen(false);

  // prevent closing dialog when repeat modal is open
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && repeatModalOpen) return;
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!deal || !open) return;

    const applyDealToForm = (sourceDeal: any) => {
      const imagesArr: string[] =
        Array.isArray(sourceDeal.images) && sourceDeal.images.length > 0
          ? (sourceDeal.images.filter(Boolean) as string[])
          : sourceDeal.image
            ? [sourceDeal.image]
            : [];

      let repeatObj = null;
      if (sourceDeal.repeat) {
        try {
          repeatObj =
            typeof sourceDeal.repeat === 'string' ? JSON.parse(sourceDeal.repeat) : sourceDeal.repeat;
          repeatObj = ensureRepeatShape(repeatObj);
        } catch {
          repeatObj = ensureRepeatShape(null);
        }
      } else {
        repeatObj = ensureRepeatShape(null);
      }

      const incomingPriceType =
        typeof sourceDeal.price_type === 'string' ? sourceDeal.price_type : null;
      const incomingPriceText =
        typeof sourceDeal.price_text === 'string' ? sourceDeal.price_text : '';
      const derivedPriceMode: 'empty' | 'amount' | 'text' =
        incomingPriceType === 'text'
          ? 'text'
          : incomingPriceType === 'amount'
            ? 'amount'
            : incomingPriceText
              ? 'text'
              : sourceDeal.price !== null && sourceDeal.price !== undefined
                ? 'amount'
                : 'empty';

      setEdited({
        title: sourceDeal.title ?? '',
        description: sourceDeal.description ?? '',
        priceMode: derivedPriceMode,
        displayPrice: derivedPriceMode === 'amount' ? formatPriceForDisplay(sourceDeal.price) : '',
        price: derivedPriceMode === 'amount' ? (sourceDeal.price ?? null) : null,
        priceText: derivedPriceMode === 'text' ? incomingPriceText : '',
        starts_at: sourceDeal.starts_at ? toDateInput(sourceDeal.starts_at) : '',
        ends_at: sourceDeal.ends_at ? toDateInput(sourceDeal.ends_at) : '',
        images: imagesArr,
        repeat: repeatObj,
      });

      setCurrentDealId(sourceDeal.id ?? deal.id ?? null);
    };

    const loadDealForEdit = async () => {
      if (!deal.id || deal.id === 'new') {
        applyDealToForm(deal);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('deals')
          .select('id, title, description, starts_at, ends_at, images, image, price, price_type, price_text, repeat')
          .eq('id', deal.id)
          .maybeSingle();

        if (error || !data) {
          applyDealToForm(deal);
          return;
        }

        applyDealToForm({
          ...deal,
          ...data,
        });
      } catch {
        applyDealToForm(deal);
      }
    };

    loadDealForEdit();
  }, [deal, open]);
  const handleClose = () => {
    setRepeatModalOpen(false);
    handleDialogOpenChange(false);
    navigate('/merchant-dashboard');
  };

  const getCurrentMerchantId = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('get_current_merchant');
      if (error) {
        console.error('get_current_merchant error:', error);
        return null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return row?.id ?? row?.merchant_id ?? null;
    } catch (e) {
      console.error('get_current_merchant exception:', e);
      return null;
    }
  };

  useEffect(() => {
    if (!open) return;

    const loadMerchantPlanAndLimit = async () => {
      const merchantId = await getCurrentMerchantId();
      if (!merchantId) {
        setPlanName('Starter Course');
        setMaxMediaItems(STARTER_MEDIA_LIMIT);
        setMerchantAddressText('');
        setMerchantName('Restaurant name');
        setMerchantLogo('');
        setMerchantCategory('Restaurant');
        setMerchantWebsiteText('');
        return;
      }

      try {
        const { data: merchantRow, error: merchantError } = await supabase
          .from('merchants')
          .select('name, logo, category, website, address, google_address, subscription_plan_id, subscription_plans(name, features)')
          .eq('id', merchantId)
          .maybeSingle();

        if (merchantError) {
          console.warn('Could not load merchant preview data', merchantError);
        }

        const merchantAddress = [merchantRow?.address, merchantRow?.google_address]
          .map(value => (typeof value === 'string' ? value.trim() : ''))
          .find(Boolean) || '';
        setMerchantAddressText(merchantAddress);
        setMerchantName(
          typeof merchantRow?.name === 'string' && merchantRow.name.trim()
            ? merchantRow.name.trim()
            : 'Restaurant name'
        );
        setMerchantLogo(
          typeof merchantRow?.logo === 'string' && merchantRow.logo.trim()
            ? merchantRow.logo.trim()
            : ''
        );
        setMerchantCategory(
          typeof merchantRow?.category === 'string' && merchantRow.category.trim()
            ? merchantRow.category.trim()
            : 'Restaurant'
        );
        setMerchantWebsiteText(
          typeof merchantRow?.website === 'string' && merchantRow.website.trim()
            ? merchantRow.website.trim()
            : 'dinedeals.co.za'
        );

        const { data: subscriptionRow, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('subscription_plans(name, features)')
          .eq('merchant_id', merchantId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscriptionError) {
          console.warn('Could not load active subscription plan for media limit', subscriptionError);
        }

        const subscriptionPlan = Array.isArray(subscriptionRow?.subscription_plans)
          ? subscriptionRow.subscription_plans[0]
          : subscriptionRow?.subscription_plans;

        const subscriptionPlanName = subscriptionPlan?.name;
        const subscriptionPlanFeatures = subscriptionPlan?.features;

        if (subscriptionPlanName) {
          setPlanName(subscriptionPlanName);
          setMaxMediaItems(getMediaLimitForPlan(subscriptionPlanName, subscriptionPlanFeatures));
          return;
        }

        const merchantPlan = Array.isArray(merchantRow?.subscription_plans)
          ? merchantRow.subscription_plans[0]
          : merchantRow?.subscription_plans;

        const merchantPlanName = merchantPlan?.name;
        const merchantPlanFeatures = merchantPlan?.features;

        if (merchantPlanName) {
          setPlanName(merchantPlanName);
          setMaxMediaItems(getMediaLimitForPlan(merchantPlanName, merchantPlanFeatures));
          return;
        }

        setPlanName('Starter Course');
        setMaxMediaItems(STARTER_MEDIA_LIMIT);
      } catch (error) {
        console.warn('Failed to load media limit plan, defaulting to Starter Course', error);
        setPlanName('Starter Course');
        setMaxMediaItems(STARTER_MEDIA_LIMIT);
        setMerchantAddressText('');
        setMerchantName('Restaurant name');
        setMerchantLogo('');
        setMerchantCategory('Restaurant');
        setMerchantWebsiteText('dinedeals.co.za');
      }
    };

        loadMerchantPlanAndLimit();
  }, [open]);

  useEffect(() => {
    setEdited(prev => {
      if ((prev.images?.length ?? 0) <= maxMediaItems) return prev;
      return {
        ...prev,
        images: (prev.images || []).slice(0, maxMediaItems),
      };
    });
  }, [maxMediaItems]);

  const handleSave = async () => {
    if (!edited.title || !edited.description) {
      toast({
        title: 'Error',
        description: 'Please fill in the Deal Offer and Description',
        variant: 'destructive',
      });
      return;
    }

    if (edited.priceMode === 'amount' && parseNumericFromDisplay(edited.displayPrice) === null) {
      toast({
        title: 'Error',
        description: 'Please enter a Rand price or choose Empty',
        variant: 'destructive',
      });
      return;
    }

    if (edited.priceMode === 'text' && !edited.priceText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter promo text or choose Empty',
        variant: 'destructive',
      });
      return;
    }

    if ((edited.images?.length ?? 0) > maxMediaItems) {
      toast({
        title: 'Media limit reached',
        description: `${planName} allows up to ${maxMediaItems} media items.`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const p_starts_at = edited.starts_at ? toStartOfDayISO(edited.starts_at) : null;
      const p_ends_at = edited.ends_at ? toEndOfDayISO(edited.ends_at) : null;
      const p_price =
        edited.priceMode === 'amount' ? parseNumericFromDisplay(edited.displayPrice) : null;
      const p_price_type =
        edited.priceMode === 'amount'
          ? 'amount'
          : edited.priceMode === 'text'
            ? 'text'
            : null;
      const p_price_text =
        edited.priceMode === 'text' ? (edited.priceText || '').trim() || null : null;
      const validImgs = (edited.images || []).filter(Boolean);
      const firstImage = validImgs.length ? validImgs[0] : null;

      // normalised repeat object we will store
      const p_repeat = edited.repeat ? ensureRepeatShape(edited.repeat) : null;
      const repeatSchedule = edited.repeat ? buildRepeatScheduleForDb(edited.repeat) : [];

      // IMPORTANT: treat deal.id === "new" as CREATE
      const isNewDeal = !deal?.id || deal.id === 'new';

      // CREATE FLOW
      if (isNewDeal) {
        const merchantId = await getCurrentMerchantId();
        if (!merchantId) {
          toast({
            title: 'Error',
            description: 'Could not find your merchant profile. Please re-login and try again.',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }

        const { data, error } = await supabase.rpc('create_deal', {
          p_merchant_id: merchantId,
          p_title: edited.title,
          p_description: edited.description,
          p_price,
          p_starts_at,
          p_ends_at,
          p_latitude: null,
          p_longitude: null,
          p_image: firstImage,
          p_is_active: true,
          p_repeat,
          p_price_type,
          p_price_text,
        });
        if (error) throw error;

        const inserted = Array.isArray(data) ? data[0] : data;
        const newDealId = inserted?.id;

        // ensure repeat JSON is stored via RPC
        if (newDealId && p_repeat) {
          const { error: repeatJsonErr } = await supabase.rpc('update_deal_repeat', {
            p_deal_id: newDealId,
            p_repeat: p_repeat,
          });
          if (repeatJsonErr) {
            console.warn('⚠️ Failed to update repeat JSON for new deal', newDealId, repeatJsonErr);
          }
        }

        if (newDealId && validImgs.length > 0) {
          const { error: imgErr } = await supabase.rpc('update_deal_images', {
            p_deal_id: newDealId,
            p_images: validImgs,
          });
          if (imgErr) console.warn('⚠️ Failed to persist full images array after create', imgErr);
        }

        if (newDealId) {
          supabase
            .rpc('rpc_upsert_deal_repeat_rules', {
              p_deal_id: newDealId,
              p_schedule: repeatSchedule.length ? repeatSchedule : null,
            })
            .then(({ error: repeatErr }) => {
              if (repeatErr) {
                console.warn('⚠️ Failed to upsert repeat rules for new deal', repeatErr);
              }
            })
            .catch(repeatErr => {
              console.warn('⚠️ Exception while upserting repeat rules for new deal', repeatErr);
            });
        }

        toast({ title: 'Success', description: 'Deal created' });
        onDealUpdated();
        setSaving(false);
        setRepeatModalOpen(false);
        handleDialogOpenChange(false);
        navigate('/merchant-dashboard');
        return;
      }

      // UPDATE FLOW – guard against bad placeholder ids
      if (!deal?.id || deal.id === 'new') {
        throw new Error('Invalid deal id for update');
      }

const isActive = true;

const p_payload: any = {
  title: edited.title,
  description: edited.description,
  is_active: isActive,
  price_type: p_price_type,
  price: p_price,
  price_text: p_price_text,
};

if (p_starts_at) p_payload.starts_at = p_starts_at;
if (p_ends_at) {
  p_payload.ends_at = p_ends_at;
  p_payload.valid_until = p_ends_at;
}
if (firstImage) p_payload.image = firstImage;
if (p_repeat && p_repeat.days?.length > 0) p_payload.repeat = p_repeat;

      const { error } = await supabase.rpc('update_deal_safe', {
        p_deal_id: deal.id,
        p_payload,
      });
      if (error) throw error;

      // ensure repeat JSON is stored via RPC so My Deals card sees correct days
if (deal.id && p_repeat && Array.isArray(p_repeat.days) && p_repeat.days.length > 0) {
  const { error: repeatJsonErr } = await supabase.rpc('update_deal_repeat', {
    p_deal_id: deal.id,
    p_repeat: p_repeat,
  });
  if (repeatJsonErr) {
    console.warn('⚠️ Failed to update repeat JSON for existing deal', deal.id, repeatJsonErr);
  }
}

if (deal.id && validImgs.length > 0) {
  const { error: imgErr } = await supabase.rpc('update_deal_images', {
    p_deal_id: deal.id,
    p_images: validImgs,
  });
  if (imgErr) console.error('⚠️ Failed to persist full images array', imgErr);
}

      if (deal.id) {
        supabase
          .rpc('rpc_upsert_deal_repeat_rules', {
            p_deal_id: deal.id,
            p_schedule: repeatSchedule.length ? repeatSchedule : null,
          })
          .then(({ error: repeatErr }) => {
            if (repeatErr) {
              console.warn('⚠️ Failed to upsert repeat rules for existing deal', repeatErr);
            }
          })
          .catch(repeatErr => {
            console.warn(
              '⚠️ Exception while upserting repeat rules for existing deal',
              repeatErr
            );
          });
      }

      toast({ title: 'Success', description: 'Deal updated' });

      setCurrentDealId(deal.id ?? null);
      onDealUpdated();
      setSaving(false);
      setRepeatModalOpen(false);
      handleDialogOpenChange(false);
      navigate('/merchant-dashboard');
    } catch (err: any) {
      console.error('Save deal error:', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to save deal',
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  // preview values
  const previewPrice =
    edited.priceMode === 'amount'
      ? formatPriceForDisplay(parseNumericFromDisplay(edited.displayPrice))
      : edited.priceMode === 'text'
        ? edited.priceText.trim()
        : '';
  const previewExpiry = formatExpiryDate(edited.ends_at || edited.starts_at);
  const repeatShape = ensureRepeatShape(edited.repeat);
  const hasDays = repeatShape.days && repeatShape.days.length > 0;

  const activeDayAbbrs = hasDays
    ? WEEK_DAYS.filter(d => repeatShape.days.includes(d.key)).map(d => d.label)
    : [];

  const baseImages =
    edited.images && edited.images.length ? edited.images.filter(Boolean) : [PLACEHOLDER_IMAGE];

  useEffect(() => {
    setPreviewStartIndex(0);
  }, [deal.id, edited.images]);

  useEffect(() => {
    if (baseImages.length <= 3) return;

    const intervalId = window.setInterval(() => {
      setPreviewStartIndex(prev => (prev + 1) % baseImages.length);
    }, PREVIEW_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [baseImages.length]);

  const previewImages = Array.from({ length: Math.min(3, baseImages.length) }, (_, index) => {
    return baseImages[(previewStartIndex + index) % baseImages.length];
  });

  while (previewImages.length < 3) previewImages.push(PLACEHOLDER_IMAGE);

  const previewDescription = edited.description || 'Short description for the deal.';
  const previewDescriptionIsLong = previewDescription.length > 140;
  const previewDescriptionText = previewDescriptionIsLong
    ? `${previewDescription.slice(0, 140).trimEnd()}...`
    : previewDescription;
  const previewDistanceText = '1.5 km';
  const previewWebsite = merchantWebsiteText || 'dinedeals.co.za';
  const previewCategory = merchantCategory || 'Restaurant';
  const previewMerchantName = merchantName || 'Restaurant name';

  // Render portal modal when open
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[999999] flex items-start justify-center"
      onMouseDown={() => {
        if (!repeatModalOpen) handleDialogOpenChange(false);
      }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <div
        ref={innerRef}
        className="relative bg-[#F3F4F6] w-[92%] max-w-md sm:max-w-lg md:w-[calc(100vw-48px)] md:max-w-[1080px] mx-auto mt-[10vh] h-[85vh] max-h-[85vh] overflow-y-auto md:mt-6 md:mb-6 md:h-auto md:max-h-[calc(100vh-48px)] md:overflow-y-auto px-3 pt-3 pb-2 md:px-4 md:pt-3 md:pb-5 rounded-2xl shadow-lg"
        style={{ paddingBottom: `${bottomPaddingPx}px` }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="mt-1 md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-4 md:items-start">
          {/* LEFT: form */}
          <div className="space-y-3 pb-0">
            <div>
              <label htmlFor="editDealTitle" className="block text-sm font-medium text-gray-700">
                Deal Title <span className="text-red-500">*</span> (
                {edited.title?.length ?? 0}/{DEAL_TITLE_LIMIT})
              </label>
              <textarea
                id="editDealTitle"
                rows={2}
                value={edited.title}
                onChange={e => {
                  const nextTitle = sanitizeAndTrim(e.target.value, DEAL_TITLE_LIMIT);
                  setEdited(prev => ({ ...prev, title: nextTitle }));
                }}
                placeholder="50% off all coffees"
                className="bg-white block w-full mt-1 border rounded-md px-2 py-2 resize-none"
                style={{
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="editDealDescription"
                className="block text-sm font-medium text-gray-700"
              >
                Description <span className="text-red-500">*</span> (
                {edited.description?.length ?? 0}/{DEAL_DESCRIPTION_LIMIT})
              </label>
              <textarea
                id="editDealDescription"
                value={edited.description}
                onChange={e => {
                  const nextDescription = sanitizeAndTrim(
                    e.target.value,
                    DEAL_DESCRIPTION_LIMIT
                  );
                  setEdited(prev => ({ ...prev, description: nextDescription }));
                }}
                rows={4}
                placeholder="Short description for the deal"
                className="bg-white block w-full mt-1 border rounded-md px-2 py-2 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Deal Value</label>

              <select
                value={edited.priceMode}
                onChange={e => {
                  const nextMode = e.target.value as 'empty' | 'amount' | 'text';
                  setEdited(prev => ({
                    ...prev,
                    priceMode: nextMode,
                    displayPrice: nextMode === 'amount' ? prev.displayPrice : '',
                    price: nextMode === 'amount' ? prev.price : null,
                    priceText: nextMode === 'text' ? prev.priceText : '',
                  }));
                }}
                className="bg-white block w-full mt-1 border rounded-md px-2 py-2"
              >
                <option value="empty">Empty</option>
                <option value="amount">R Price</option>
                <option value="text">Promo Text</option>
              </select>

              {edited.priceMode === 'amount' && (
                <input
                  id="editDealPrice"
                  value={edited.displayPrice}
                  onChange={e => {
                    const v = e.target.value;
                    const numeric = v.replace(/[^0-9.]/g, '');
                    setEdited(prev => ({
                      ...prev,
                      displayPrice: v,
                      price: numeric ? parseFloat(numeric) : null,
                    }));
                  }}
                  placeholder="R199.95"
                  inputMode="decimal"
                  className="bg-white block w-full mt-2 border rounded-md px-2 py-2"
                />
              )}

              {edited.priceMode === 'text' && (
                <input
                  id="editDealPriceText"
                  value={edited.priceText}
                  onChange={e =>
                    setEdited(prev => ({
                      ...prev,
                      priceText: sanitizeAndTrim(e.target.value, 40),
                    }))
                  }
                  placeholder="50% Off or 2 for 1"
                  className="bg-white block w-full mt-2 border rounded-md px-2 py-2"
                />
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-4 h-4" />
                Days Repeated (optional)
              </label>

              <div className="flex items-start justify-between gap-2 mt-1">
                <div className="text-xs text-gray-600 flex-1">
                  Select active days (if important) within the deal dates
                </div>
                <div>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      openRepeatModal();
                    }}
                    aria-label="Configure repeat"
                    title="Configure repeat"
                    style={{
                      width: 104,
                      height: 44,
                      padding: 0,
                      borderRadius: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      cursor: 'pointer',
                      color: '#ffffff',
                    }}
                  >
                    <Pencil className="w-[18px] h-[18px] text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-4 h-4" />
                Starts <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={edited.starts_at}
                onChange={e => setEdited(prev => ({ ...prev, starts_at: e.target.value }))}
                className="bg-white block w-full mt-1 border rounded-md px-2 py-2"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-4 h-4" />
                Ends <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={edited.ends_at}
                onChange={e => setEdited(prev => ({ ...prev, ends_at: e.target.value }))}
                className="bg-white block w-full mt-1 border rounded-md px-2 py-2"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Plus className="w-4 h-4" />
                Media upload (optional)
              </label>

              <DealThumbnailUpload
                dealId={deal?.id && deal.id !== 'new' ? deal.id : ''}
                images={edited.images}
                maxMedia={maxMediaItems}
                onImagesChange={images => {
                  const limitedImages = (images || []).slice(0, maxMediaItems);
                  if ((images || []).length > maxMediaItems) {
                    toast({
                      title: 'Media limit reached',
                      description: `${planName} allows up to ${maxMediaItems} media items.`,
                      variant: 'destructive',
                    });
                  }
                  setEdited(prev => ({ ...prev, images: limitedImages }));
                }}
                label={`Max ${maxMediaItems} media items • JPG max 1080×1080 (300 KB) • MP4 max 1080×1920 (60s, 15 MB)`}
              />
            </div>

            <div className="w-full flex justify-end gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-label="Save changes"
                title={saving ? 'Saving...' : 'Save'}
                style={{
                  width: 104,
                  height: 44,
                  padding: 0,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  color: '#ffffff',
                }}
              >
                <span style={{display:"flex",alignItems:"center",gap:6}}><Check style={{ width: 18, height: 18, color: "#ffffff" }} /> Save</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                aria-label="Cancel"
                title="Cancel"
                style={{
                  width: 104,
                  height: 44,
                  padding: 0,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  backgroundColor: '#9ca3af',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  color: '#ffffff',
                }}
              >
                <span style={{display:"flex",alignItems:"center",gap:6}}><IconX style={{ width: 18, height: 18, color: "#ffffff" }} /> Cancel</span>
              </button>
            </div>
          </div>

          {/* RIGHT: preview */}
          <div className="mt-8 md:mt-0 md:h-full md:flex md:justify-start">
            <div className="w-full md:w-[320px] md:max-w-full md:h-full">
              <div className="mb-2 text-sm font-semibold text-gray-900">Deal Preview</div>

              <div className="flex h-full flex-col items-center">
                <div className="w-full max-w-[320px] rounded-[34px] bg-[#f3f4f6] p-2.5 shadow-sm">
                  <div className="mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-[30px] bg-white px-3 py-2.5 text-sm flex flex-col">
                    <div className="mb-2.5 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="h-[38px] w-[38px] shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
                          {merchantLogo ? (
                            <img
                              src={merchantLogo}
                              alt={previewMerchantName}
                              className="h-full w-full object-cover"
                              onError={e => {
                                const t = e.target as HTMLImageElement;
                                t.onerror = null;
                                t.src = PLACEHOLDER_IMAGE;
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#f3f4f6] text-gray-400">
                              <UtensilsCrossed className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div
                            className="text-[12px] font-semibold leading-tight text-[#111827]"
                            style={{
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-word',
                            }}
                          >
                            {previewMerchantName}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-normal text-[#6b7280]">
                            <div className="flex min-w-0 items-center gap-1">
                              <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-[#D79A2B]" />
                              <span className="truncate">{previewCategory}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#55b96c]" />
                              <span>{previewDistanceText}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          aria-label="Share preview"
                          className="pointer-events-none flex h-7 w-7 items-center justify-center rounded-full bg-transparent p-0 text-[#111827]"
                          tabIndex={-1}
                        >
                          <Share2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          aria-label="Close preview"
                          className="pointer-events-none flex h-7 w-7 items-center justify-center rounded-full bg-transparent p-0 text-[#111827]"
                          tabIndex={-1}
                        >
                          <IconX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div
                      className="mb-2.5 text-[17px] font-extrabold leading-[1.15] text-[#111827]"
                      style={{
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                    >
                      {edited.title || 'Deal title'}
                    </div>

                    <div className="mb-1.5">
                      <div className="grid grid-cols-3 gap-2">
                        {previewImages.map((src, idx) => {
                          const isPlaceholder = src === PLACEHOLDER_IMAGE;
                          const showVideo = !isPlaceholder && isVideoUrl(src);
                          const posterUrl = showVideo ? derivePosterUrl(src) : null;

                          return (
                            <div
                              key={`preview-${src}-${idx}`}
                              className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[14px] bg-gray-100"
                            >
                              <img
                                src={showVideo ? (posterUrl || PLACEHOLDER_IMAGE) : (src || PLACEHOLDER_IMAGE)}
                                alt={showVideo ? `Deal poster ${idx + 1}` : `Deal media ${idx + 1}`}
                                className="h-full w-full object-cover"
                                onError={e => {
                                  const t = e.target as HTMLImageElement;
                                  t.src = PLACEHOLDER_IMAGE;
                                }}
                              />
                              {showVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-[11px] font-semibold text-white">
                                  Video
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mb-2 text-center text-[10px] font-normal text-[#9ca3af]">
                      Tap image to expand
                    </div>

                    {activeDayAbbrs.length > 0 ? (
                      <div className="mb-2 text-[11px] leading-snug text-[#4b5563]">
                        <span className="font-semibold text-[#111827]">Valid:</span>{' '}
                        {activeDayAbbrs.join(' • ')}
                      </div>
                    ) : (
                      <div className="mb-2 text-[11px] leading-snug text-[#4b5563]">
                        <span className="font-semibold text-[#111827]">Valid:</span> Every day
                      </div>
                    )}

                    <div className="mb-1.5 text-[11px] leading-[1.35] text-[#4b5563] break-words whitespace-normal">
                      {previewDescriptionText}
                    </div>

                    <div className="mb-2.5 text-[11px] font-semibold text-[#61b46e]">
                      Read more
                    </div>

{previewPrice ? (
                      <div className="mt-auto mb-2 flex items-end gap-2 overflow-hidden">
                        <div
                          className="shrink-0 font-extrabold leading-none text-[#dc2626]"
                          style={{ fontSize: '1.1rem' }}
                        >
                          {previewPrice}
                        </div>

                        <div className="min-w-0 flex items-center gap-1 text-[10px] font-normal text-[#9ca3af]">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#d97706]" />
                          <span className="truncate whitespace-nowrap">
                            {previewExpiry ? `Expires: ${previewExpiry}` : 'Expires: dd/mm/yyyy'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto mb-2 flex items-center gap-1.5 overflow-hidden text-[10px] font-normal text-[#9ca3af]">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-[#d97706]" />
                        <span className="truncate whitespace-nowrap">
                          {previewExpiry ? `Expires: ${previewExpiry}` : 'Expires: dd/mm/yyyy'}
                        </span>
                      </div>
                    )}

                    <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-normal text-[#4f6fd6] break-words">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span>{previewWebsite}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex h-[44px] items-center justify-center rounded-[12px] bg-[#e42320] shadow-sm">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex h-[44px] items-center justify-center rounded-[12px] bg-[#1fad4b] shadow-sm">
                        <MessageCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex h-[44px] items-center justify-center rounded-[12px] bg-[#db7d07] shadow-sm">
                        <Send className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-center text-xs text-gray-500">
                  Customer screen may have small layout changes
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {repeatModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000000] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/50 z-[1000000]"
              onMouseDown={closeRepeatModal}
            />
            <div
              className="relative max-w-xl w-full mx-4 bg-white rounded-lg shadow-lg z-[1000001] pointer-events-auto"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <h3 className="text-lg font-medium">Repeat — Configure</h3>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="text-sm text-gray-600">
                  Select days — the deal will apply on chosen days within any time ranges you add.
                </div>

                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map(d => {
                    const selected =
                      edited.repeat &&
                      Array.isArray(edited.repeat.days) &&
                      edited.repeat.days.includes(d.key);
                    return (
                      <label
                        key={d.key}
                        className="inline-flex items-center space-x-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleDay(d.key)}
                          className="form-checkbox"
                          style={{ accentColor: '#16a34a' }}
                        />
                        <span>{d.label}</span>
                      </label>
                    );
                  })}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Time ranges (optional)</div>

                    <button
                      type="button"
                      onClick={() => {
                        addTimeRange();
                        ensureTimezoneOnRepeat();
                      }}
                      aria-label="Edit time ranges"
                      title="Edit time ranges"
                      style={{
                        width: 104,
                        height: 44,
                        padding: 0,
                        borderRadius: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        cursor: 'pointer',
                        color: '#ffffff',
                      }}
                    >
                      <Pencil className="w-[18px] h-[18px] text-white" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {ensureRepeatShape(edited.repeat).time_ranges.map((tr: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={tr.start}
                          onChange={e => updateTimeRange(idx, 'start', e.target.value)}
                          className="px-2 py-1 border rounded-md text-sm bg-[#F3F4F6]"
                        />
                        <span className="text-sm">to</span>
                        <input
                          type="time"
                          value={tr.end}
                          onChange={e => updateTimeRange(idx, 'end', e.target.value)}
                          className="px-2 py-1 border rounded-md text-sm bg-[#F3F4F6]"
                        />
                        <button
                          type="button"
                          onClick={() => removeTimeRange(idx)}
                          aria-label="Remove time range"
                          title="Remove time range"
                          style={{
                            width: 104,
                            height: 44,
                            padding: 0,
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            backgroundColor: '#9ca3af',
                            cursor: 'pointer',
                            color: '#ffffff',
                          }}
                        >
                          <span style={{display:"flex",alignItems:"center",gap:6}}><IconX style={{ width: 18, height: 18, color: "#ffffff" }} /> Cancel</span>
                        </button>
                      </div>
                    ))}
                    {ensureRepeatShape(edited.repeat).time_ranges.length === 0 && (
                      <div className="text-xs text-gray-500">
                        No time ranges set — selected days mean the whole day.
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  Timezone: {edited.repeat?.timezone ?? getUserTimezone()}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={closeRepeatModal}
                    aria-label="Save repeat settings"
                    title="Save repeat settings"
                    style={{
                      width: 104,
                      height: 44,
                      padding: 0,
                      borderRadius: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      backgroundColor: '#16a34a',
                      cursor: 'pointer',
                      color: '#ffffff',
                    }}
                  >
                    <span style={{display:"flex",alignItems:"center",gap:6}}><Check style={{ width: 18, height: 18, color: "#ffffff" }} /> Save</span>
                  </button>

                  <button
                    type="button"
                    onClick={closeRepeatModal}
                    aria-label="Cancel repeat changes"
                    title="Cancel repeat changes"
                    style={{
                      width: 104,
                      height: 44,
                      padding: 0,
                      borderRadius: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      backgroundColor: '#9ca3af',
                      cursor: 'pointer',
                      color: '#ffffff',
                    }}
                  >
                    <span style={{display:"flex",alignItems:"center",gap:6}}><IconX style={{ width: 18, height: 18, color: "#ffffff" }} /> Cancel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  );
};

export default EditDealDialog;