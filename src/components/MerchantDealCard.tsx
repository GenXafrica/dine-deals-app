// src/components/MerchantDealCard.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Globe, Clock, Navigation, ThumbsUp, Heart } from 'lucide-react';
import { Deal } from '@/types';
import { supabase } from '@/lib/supabase';

interface MerchantInfo {
  id: string;
  restaurant_name: string;
  logo?: string;
  address: string;
  phone: string;
  website?: string;
}

interface MerchantDealCardProps {
  merchant: MerchantInfo;
  deals: Deal[];
  distance?: number;
}

type RepeatTimeRange = { start: string; end: string };
type RepeatShape = {
  days: string[]; // any subset of ["mon","tue","wed","thu","fri","sat","sun"]
  time_ranges: RepeatTimeRange[];
  timezone?: string;
};

export const MerchantDealCard: React.FC<MerchantDealCardProps> = ({
  merchant,
  deals,
  distance
}) => {
  const getFallbackImageSrc = (label: string) => {
    const initial = (label || '?').trim().charAt(0).toUpperCase() || '?';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <rect width="96" height="96" rx="48" fill="#F3F4F6" />
        <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">${initial}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('27')) {
      return `+${cleaned}`;
    }
    return phone;
  };

  const handleAddressClick = () => {
    const encodedAddress = encodeURIComponent(merchant.address);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handlePhoneClick = () => {
    const formattedPhone = formatPhone(merchant.phone);
    window.location.href = `tel:${formattedPhone}`;
  };

  const handleNavigate = (address: string, businessName: string) => {
    const encodedAddress = encodeURIComponent(address);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      const googleMapsUrl = `https://maps.google.com/maps?daddr=${encodedAddress}&dirflg=d`;
      const wazeUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

      const wazeLink = document.createElement('a');
      wazeLink.href = wazeUrl;
      wazeLink.target = '_blank';

      try {
        wazeLink.click();
        setTimeout(() => {
          window.open(googleMapsUrl, '_blank');
        }, 1000);
      } catch (error) {
        window.open(googleMapsUrl, '_blank');
      }
    } else {
      const googleMapsUrl = `https://maps.google.com/maps?daddr=${encodedAddress}&dirflg=d`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 35) return address;
    return address.substring(0, 32) + '...';
  };

  const activeDeals = deals.filter(deal =>
    new Date(deal.validUntil) > new Date()
  );

  const getStatusLabel = (deal: Deal) => {
    const status = String((deal as any).status || '').toLowerCase();
    if (status === 'active') return 'Active';
    if (status === 'expiring_soon' || status === 'expiring soon') return 'Expiring Soon';

    const validUntil = new Date(deal.validUntil).getTime();
    const now = Date.now();
    const daysLeft = (validUntil - now) / (1000 * 60 * 60 * 24);

    return daysLeft <= 3 ? 'Expiring Soon' : 'Active';
  };

  const getStatusBadgeClass = (deal: Deal) => {
    return getStatusLabel(deal) === 'Expiring Soon'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-500 text-white';
  };

  const getLikeCount = (deal: Deal) => {
    const raw =
      (deal as any).green_like_count ??
      (deal as any).like_count ??
      (deal as any).likes ??
      (deal as any).thumbs_up_count ??
      0;

    return Number(raw) || 0;
  };

  const getLoveCount = (deal: Deal) => {
    const raw =
      (deal as any).love_count ??
      (deal as any).heart_count ??
      (deal as any).favourites_count ??
      (deal as any).favorites_count ??
      0;

    return Number(raw) || 0;
  };

  // state to hold repeat settings per deal (keyed by deal.id)
  const [repeatMap, setRepeatMap] = useState<Record<string, RepeatShape | null>>({});
  const [editingMap, setEditingMap] = useState<Record<string, boolean>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [saveMessageMap, setSaveMessageMap] = useState<Record<string, string>>({});

  const WEEK_DAYS = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  // helper to get user's timezone (fallback to Africa/Johannesburg)
  const getUserTimezone = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz || 'Africa/Johannesburg';
    } catch {
      return 'Africa/Johannesburg';
    }
  };

  // initialize repeatMap from deals (if deal.repeat exists)
  useEffect(() => {
    const initial: Record<string, RepeatShape | null> = {};
    deals.forEach((d) => {
      // attempt to read repeat from deal.repeat if exists
      const r = (d as any).repeat;
      if (r && typeof r === 'object') {
        initial[d.id] = {
          days: Array.isArray(r.days) ? r.days : [],
          time_ranges: Array.isArray(r.time_ranges) ? r.time_ranges.map((tr: any) => ({
            start: tr?.start ?? '00:00',
            end: tr?.end ?? '23:59'
          })) : [],
          timezone: r.timezone ?? getUserTimezone()
        };
      } else {
        initial[d.id] = {
          days: [],
          time_ranges: [],
          timezone: getUserTimezone()
        };
      }
    });
    setRepeatMap(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals]);

  // toggle edit UI
  const toggleEditing = (dealId: string) => {
    setEditingMap((s) => ({ ...s, [dealId]: !s[dealId] }));
    setSaveMessageMap((s) => ({ ...s, [dealId]: '' }));
  };

  // update a day checkbox
  const toggleDay = async (dealId: string, dayKey: string) => {
    const current = repeatMap[dealId] ?? { days: [], time_ranges: [], timezone: getUserTimezone() };
    const daysSet = new Set(current.days);
    if (daysSet.has(dayKey)) daysSet.delete(dayKey);
    else daysSet.add(dayKey);
    const updated: RepeatShape = { ...current, days: Array.from(daysSet) };
    setRepeatMap((s) => ({ ...s, [dealId]: updated }));
    await saveRepeatToDB(dealId, updated);
  };

  // add an empty time range
  const addTimeRange = (dealId: string) => {
    const current = repeatMap[dealId] ?? { days: [], time_ranges: [], timezone: getUserTimezone() };
    const updated: RepeatShape = { ...current, time_ranges: [...current.time_ranges, { start: '09:00', end: '17:00' }] };
    setRepeatMap((s) => ({ ...s, [dealId]: updated }));
    // save immediately
    saveRepeatToDB(dealId, updated);
  };

  // remove a time range by index
  const removeTimeRange = (dealId: string, idx: number) => {
    const current = repeatMap[dealId] ?? { days: [], time_ranges: [], timezone: getUserTimezone() };
    const tr = current.time_ranges.filter((_, i) => i !== idx);
    const updated: RepeatShape = { ...current, time_ranges: tr };
    setRepeatMap((s) => ({ ...s, [dealId]: updated }));
    saveRepeatToDB(dealId, updated);
  };

  // update a time range value
  const updateTimeRange = (dealId: string, idx: number, field: 'start' | 'end', value: string) => {
    const current = repeatMap[dealId] ?? { days: [], time_ranges: [], timezone: getUserTimezone() };
    const tr = current.time_ranges.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    const updated: RepeatShape = { ...current, time_ranges: tr };
    setRepeatMap((s) => ({ ...s, [dealId]: updated }));
    saveRepeatToDB(dealId, updated);
  };

  // inline save to DB
  const saveRepeatToDB = async (dealId: string, repeat: RepeatShape) => {
    try {
      setSavingMap((s) => ({ ...s, [dealId]: true }));
      setSaveMessageMap((s) => ({ ...s, [dealId]: '' }));

      const payload = {
        ...repeat,
        timezone: repeat.timezone ?? getUserTimezone()
      };

      const { data, error } = await supabase
        .from('deals')
        .update({ repeat: payload })
        .eq('id', dealId)
        .select('id');

      if (error) {
        console.error('Failed to save repeat', error);
        setSaveMessageMap((s) => ({ ...s, [dealId]: 'Save failed' }));
      } else {
        setSaveMessageMap((s) => ({ ...s, [dealId]: 'Saved' }));
      }
    } catch (err) {
      console.error(err);
      setSaveMessageMap((s) => ({ ...s, [dealId]: 'Save failed' }));
    } finally {
      setSavingMap((s) => ({ ...s, [dealId]: false }));
      // clear saved message after short delay
      setTimeout(() => {
        setSaveMessageMap((s) => ({ ...s, [dealId]: '' }));
      }, 2500);
    }
  };

  if (activeDeals.length === 0) return null;

  return (
    <Card className="hover:shadow-lg transition-shadow bg-white/95 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center space-x-3">
          {merchant.logo ? (
            <img
              src={merchant.logo}
              alt={merchant.restaurant_name}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getFallbackImageSrc(merchant.restaurant_name);
              }}
            />
          ) : (
            <img
              src={getFallbackImageSrc(merchant.restaurant_name)}
              alt={merchant.restaurant_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div className="flex-1">
            <CardTitle className="text-lg">{merchant.restaurant_name}</CardTitle>
            {distance && (
              <p className="text-sm text-gray-500">{distance.toFixed(1)} km away</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
            onClick={handleAddressClick}
            title="Open in Google Maps"
          >
            <MapPin className="w-4 h-4" />
            <span className="hover:underline">{merchant.address}</span>
          </div>
          <div className="text-sm text-gray-600">
            <span>{truncateAddress(merchant.address)}</span>
          </div>
          <Button
            type="button"
            onClick={() => handleNavigate(merchant.address, merchant.restaurant_name)}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            Go
          </Button>
        </div>

        <div className="space-y-2">
          <div
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
            onClick={handlePhoneClick}
            title="Call restaurant"
          >
            <Phone className="w-4 h-4" />
            <span className="hover:underline">{formatPhone(merchant.phone)}</span>
          </div>
          {merchant.website && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Globe className="w-4 h-4" />
              <a
                href={merchant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Visit Website
              </a>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-red-600 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Hot Deals
          </h4>
          {activeDeals.map((deal) => (
            <div key={deal.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h5
                  className="flex-1 text-lg font-semibold text-gray-900 leading-tight"
                  style={{
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {deal.title}
                </h5>

                <Badge className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(deal)}`}>
                  {getStatusLabel(deal)}
                </Badge>
              </div>

              <p
                className="mt-3 text-sm text-gray-600 leading-6"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {deal.description}
              </p>

              {/* --- REPEAT UI: inserted here between start/end type fields --- */}
              <div className="mt-4 rounded-md border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Repeat</div>
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => toggleEditing(deal.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {editingMap[deal.id] ? 'Close' : 'Edit'}
                    </Button>
                  </div>
                </div>

                {editingMap[deal.id] && (
                  <div className="mt-3 space-y-3">
                    {/* Days checkboxes */}
                    <div className="flex flex-wrap gap-2">
                      {WEEK_DAYS.map((d) => {
                        const selected = (repeatMap[deal.id]?.days ?? []).includes(d.key);
                        return (
                          <label key={d.key} className="inline-flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleDay(deal.id, d.key)}
                              className="form-checkbox"
                            />
                            <span>{d.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Time ranges */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm">Time ranges (optional)</div>
                        <Button type="button" size="sm" onClick={() => addTimeRange(deal.id)} className="bg-gray-100 border">
                          + Add
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(repeatMap[deal.id]?.time_ranges ?? []).map((tr, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={tr.start}
                              onChange={(e) => updateTimeRange(deal.id, idx, 'start', e.target.value)}
                              className="rounded-md border px-2 py-1 text-sm"
                            />
                            <span className="text-sm">to</span>
                            <input
                              type="time"
                              value={tr.end}
                              onChange={(e) => updateTimeRange(deal.id, idx, 'end', e.target.value)}
                              className="rounded-md border px-2 py-1 text-sm"
                            />
                            <Button type="button" size="sm" onClick={() => removeTimeRange(deal.id, idx)} className="bg-red-100 border text-red-600">
                              Remove
                            </Button>
                          </div>
                        ))}
                        {(repeatMap[deal.id]?.time_ranges ?? []).length === 0 && (
                          <div className="text-xs text-gray-500">No time ranges set — deal will apply whole day(s) if days are selected.</div>
                        )}
                      </div>
                    </div>

                    {/* Timezone (read only, defaulted to user) */}
                    <div className="text-xs text-gray-600">
                      Timezone: {(repeatMap[deal.id]?.timezone) ?? getUserTimezone()}
                    </div>

                    {/* Save status */}
                    <div className="text-xs text-right">
                      {savingMap[deal.id] ? (
                        <span className="text-gray-500">Saving…</span>
                      ) : saveMessageMap[deal.id] ? (
                        <span className="text-green-600">{saveMessageMap[deal.id]}</span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              {/* --- end Repeat UI --- */}

              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="flex items-center gap-5 text-base font-semibold">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <ThumbsUp className="h-5 w-5 fill-current" />
                    <span>{getLikeCount(deal)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500">
                    <Heart className="h-5 w-5 fill-current" />
                    <span>{getLoveCount(deal)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-4">
                    Edit
                  </Button>
                  <Button type="button" size="sm" className="bg-red-600 hover:bg-red-700 text-white px-4">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantDealCard;
