// src/components/EditDealDialog.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, X as IconX, Edit3, Plus } from 'lucide-react';
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
    displayPrice: '',
    price: null as number | null,
    starts_at: '' as string,
    ends_at: '' as string,
    images: [] as string[],
    repeat: null as any | null,
  });
  const [saving, setSaving] = useState(false);
  const [currentDealId, setCurrentDealId] = useState<string | null>(null);

  // full-screen player state (merchant preview box only)
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);

  // ref for inner scroll container
  const innerRef = useRef<HTMLDivElement | null>(null);

  // dynamic bottom padding so dialog content scrolls above fixed footer
  const [bottomPaddingPx, setBottomPaddingPx] = useState<number>(48);

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

    // Do not overwrite while editing same deal
    if (currentDealId === (deal.id ?? null)) return;

    const imagesArr: string[] =
      Array.isArray(deal.images) && deal.images.length > 0
        ? (deal.images.filter(Boolean) as string[])
        : deal.image
          ? [deal.image]
          : [];

    let repeatObj = null;
    if (deal.repeat) {
      try {
        repeatObj = typeof deal.repeat === 'string' ? JSON.parse(deal.repeat) : deal.repeat;
        repeatObj = ensureRepeatShape(repeatObj);
      } catch {
        repeatObj = ensureRepeatShape(null);
      }
    } else {
      repeatObj = ensureRepeatShape(null);
    }

    setEdited({
      title: deal.title ?? '',
      description: deal.description ?? '',
      displayPrice: formatPriceForDisplay(deal.price),
      price: deal.price ?? null,
      starts_at: deal.starts_at ? toDateInput(deal.starts_at) : '',
      ends_at: deal.ends_at ? toDateInput(deal.ends_at) : '',
      images: imagesArr,
      repeat: repeatObj,
    });

    setCurrentDealId(deal.id ?? null);
  }, [deal, open, currentDealId]);

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

  const handleSave = async () => {
    if (!edited.title || !edited.description) {
      toast({
        title: 'Error',
        description: 'Please fill in the Deal Offer and Description',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const p_starts_at = edited.starts_at ? toStartOfDayISO(edited.starts_at) : null;
      const p_ends_at = edited.ends_at ? toEndOfDayISO(edited.ends_at) : null;
      const p_price = parseNumericFromDisplay(edited.displayPrice);
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

const p_payload: any = {
  title: edited.title,
  description: edited.description,
  is_active: deal.is_active ?? true,
};

// only include if actually set
if (p_price !== null) p_payload.price = p_price;
if (p_starts_at) p_payload.starts_at = p_starts_at;
if (p_ends_at) p_payload.ends_at = p_ends_at;
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
  const previewPrice = formatPriceForDisplay(edited.price);
  const previewExpiry = formatExpiryDate(edited.ends_at || edited.starts_at);
  const repeatShape = ensureRepeatShape(edited.repeat);
  const hasDays = repeatShape.days && repeatShape.days.length > 0;

  const activeDayAbbrs = hasDays
    ? WEEK_DAYS.filter(d => repeatShape.days.includes(d.key)).map(d => d.label)
    : [];

  const baseImages =
    edited.images && edited.images.length ? edited.images : [PLACEHOLDER_IMAGE];
  const previewImages = baseImages.slice(0, 3);
  while (previewImages.length < 3) previewImages.push(PLACEHOLDER_IMAGE);

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
        className="relative bg-white w-[92%] max-w-md sm:max-w-lg md:max-w-4xl mx-auto mt-[10vh] h-[85vh] max-h-[85vh] overflow-y-auto px-3 pt-3 pb-2 md:px-6 md:pt-4 md:pb-6 rounded-2xl shadow-lg"
        style={{ paddingBottom: `${bottomPaddingPx}px` }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="mt-1 md:grid md:grid-cols-2 md:gap-6">
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
                className="bg-[#F3F4F6] block w-full mt-1 border rounded-md px-2 py-2 resize-none"
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
                className="bg-[#F3F4F6] block w-full mt-1 border rounded-md px-2 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Price (optional)</label>
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
                className="bg-[#F3F4F6] block w-full mt-1 border rounded-md px-2 py-2"
              />
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
                      minWidth: 44,
                      minHeight: 44,
                      padding: 8,
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
                    <Edit3 style={{ width: 18, height: 18, color: '#ffffff' }} />
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
                className="bg-[#F3F4F6] block w-full mt-1 border rounded-md px-2 py-2"
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
                className="bg-[#F3F4F6] block w-full mt-1 border rounded-md px-2 py-2"
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
                onImagesChange={images => setEdited(prev => ({ ...prev, images }))}
                label="JPG max 1080×1080 (300 KB) • MP4 max 1080×1920 (60s, 15 MB)"
              />
            </div>
          </div>

          {/* RIGHT: preview */}
          <div className="mt-8 md:mt-0">
            <div
              className="bg-white border rounded-lg shadow-sm p-3 text-sm"
              style={{ borderColor: '#FBB345', borderWidth: 2 }}
            >
              <h3 className="font-semibold mb-2">Deal Preview</h3>

              <div
                className="font-extrabold text-base md:text-lg text-gray-900 mb-2 leading-tight"
                style={{
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {edited.title || 'Deal title'}
              </div>

              <div className="mb-2">
                <div className="grid grid-cols-3 gap-2">
                  {previewImages.map((src, idx) => {
                    const isPlaceholder = src === PLACEHOLDER_IMAGE;
                    const showVideo = !isPlaceholder && isVideoUrl(src);
                    const posterUrl = showVideo ? derivePosterUrl(src) : null;

                    return (
                      <div
                        key={idx}
                        className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm relative"
                      >
                        {showVideo ? (
                          <>
                            <img
                              src={posterUrl || PLACEHOLDER_IMAGE}
                              alt={`Deal poster ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={e => {
                                const t = e.target as HTMLImageElement;
                                t.src = PLACEHOLDER_IMAGE;
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPlayerUrl(src);
                                setPlayerOpen(true);
                              }}
                              aria-label="Play video"
                              className="absolute inset-0 flex items-center justify-center"
                              style={{ background: 'transparent', border: 'none' }}
                            >
                              <div
                                style={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: 9999,
                                  background: 'rgba(0,0,0,0.45)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                  <path d="M8 5v14l11-7-11-7z" fill="#fff" />
                                </svg>
                              </div>
                            </button>
                          </>
                        ) : (
                          <img
                            src={src || PLACEHOLDER_IMAGE}
                            alt={`Deal media ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={e => {
                              const t = e.target as HTMLImageElement;
                              t.src = PLACEHOLDER_IMAGE;
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

{activeDayAbbrs.length > 0 ? (
  <div
    className="mb-2 text-xs text-gray-700"
    style={{
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    <span style={{ fontWeight: 700, color: "#111827" }}>Valid:</span>{" "}
    {activeDayAbbrs.join(" • ")}
  </div>
) : (
  <div className="mb-2 text-xs text-gray-500">
    Applies on all days within the deal dates.
  </div>
)}

              <div className="mb-2 text-xs text-gray-700 break-words whitespace-normal">
                {edited.description || 'Short description for the deal.'}
              </div>

              <div className="flex items-center gap-3 mb-3">
                {previewPrice && (
                  <div className="font-extrabold text-xl md:text-2xl text-red-600">
                    {previewPrice}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {previewExpiry ? `Expires: ${previewExpiry}` : 'Expires: dd/mm/yyyy'}
                  </span>
                </div>
              </div>

              <div className="mt-1 text-[11px] text-gray-500 text-center">
                Customer screen may have small layout changes.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 mb-0">
          <div className="w-full flex justify-end gap-3 md:hidden">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              aria-label="Save changes"
              title={saving ? 'Saving...' : 'Save'}
              style={{
                minWidth: 44,
                minHeight: 44,
                padding: 8,
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
              <Check style={{ width: 18, height: 18, color: '#ffffff' }} />
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              aria-label="Cancel"
              title="Cancel"
              style={{
                minWidth: 44,
                minHeight: 44,
                padding: 8,
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
              <IconX style={{ width: 18, height: 18, color: '#ffffff' }} />
            </button>
          </div>

          <div className="w-full hidden md:flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              aria-label="Save changes"
              title={saving ? 'Saving...' : 'Save'}
              style={{
                minWidth: 44,
                minHeight: 44,
                padding: 8,
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
              <Check style={{ width: 18, height: 18, color: '#ffffff' }} />
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              aria-label="Cancel"
              title="Cancel"
              style={{
                minWidth: 44,
                minHeight: 44,
                padding: 8,
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
              <IconX style={{ width: 18, height: 18, color: '#ffffff' }} />
            </button>
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
                        minWidth: 44,
                        minHeight: 44,
                        padding: 8,
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
                      <Edit3 style={{ width: 18, height: 18, color: '#ffffff' }} />
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
                            minWidth: 44,
                            minHeight: 44,
                            padding: 8,
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
                          <IconX style={{ width: 18, height: 18, color: '#ffffff' }} />
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
                      minWidth: 44,
                      minHeight: 44,
                      padding: 8,
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
                    <Check style={{ width: 18, height: 18, color: '#ffffff' }} />
                  </button>

                  <button
                    type="button"
                    onClick={closeRepeatModal}
                    aria-label="Cancel repeat changes"
                    title="Cancel repeat changes"
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      padding: 8,
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
                    <IconX style={{ width: 18, height: 18, color: '#ffffff' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {playerOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[1100000] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            onMouseDown={() => {
              setPlayerOpen(false);
              setPlayerUrl(null);
            }}
          >
            <div className="absolute inset-0 bg-black z-[1100000]" />
            <div
              className="relative z-[1100001] w-full max-w-xl mx-4 rounded-lg overflow-hidden"
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="flex justify-end p-2 bg-black/20">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerOpen(false);
                    setPlayerUrl(null);
                  }}
                  aria-label="Close player"
                  className="p-2 text-white"
                >
                  <IconX />
                </button>
              </div>
              <div className="bg-black">
                {playerUrl && (
                  <video
                    src={playerUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-[70vh] md:h-[80vh] object-contain bg-black"
                  />
                )}
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