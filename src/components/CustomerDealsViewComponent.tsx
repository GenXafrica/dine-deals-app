import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import CustomerDealsViewRender from "./CustomerDealsViewRender";

export type Deal = {
  id: string;
  title?: string;
  description?: string;
  price?: number | null;
  original_price?: number | null;
  images?: string[] | null;
  image?: string | null;
  valid_until?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  address?: string | null;
  phone?: string | null;
  distance_km?: number | null;
  created_at?: string | null;
  merchants?: {
    id: string;
    name?: string | null;
    logo?: string | null;
    logo_url?: string | null;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    whatsapp?: string | null;
    category?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }[];
};

// Haversine formula to compute distance in km (kept for client-side fallback)
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

type Props = {
  initialDeals?: Deal[];
  initialLoading?: boolean;
};

export default function CustomerDealsViewComponent({
  initialDeals = [],
  initialLoading = false,
}: Props) {
  const navigate = useNavigate();

  const [allDeals, setAllDeals] = useState<Deal[]>(initialDeals);
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [loading, setLoading] = useState<boolean>(initialLoading);

  const [categories, setCategories] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setAllDeals(initialDeals || []);
    setDeals(initialDeals || []);
  }, [initialDeals]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setLocation(null),
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    setLoading(true);

    let temp = [...allDeals];

    if (categories.length) {
      const setCat = new Set(categories.map((c) => c.toLowerCase()));
      temp = temp.filter((d) => {
        const cat = d.merchants?.[0]?.category?.toLowerCase() || "";
        return setCat.has(cat);
      });
    }

    if (location) {
      temp = temp.filter((d) => {
        const m = d.merchants?.[0];
        if (!m || m.latitude == null || m.longitude == null) return false;

        const dist = haversineDistance(
          location.lat,
          location.lng,
          m.latitude,
          m.longitude
        );

        return dist <= radiusKm;
      });
    }

    setDeals(temp);
    setLoading(false);
  }, [allDeals, categories, location, radiusKm]);

  const handleDelete = async (id: string) => {
    await supabase.from("deals").delete().eq("id", id);

    setAllDeals((prev) => prev.filter((d) => d.id !== id));
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <CustomerDealsViewRender
      deals={deals}
      loading={loading}
      categories={categories}
      setCategories={setCategories}
      radiusKm={radiusKm}
      setRadiusKm={setRadiusKm}
      onRadiusChange={setRadiusKm}
      onDelete={handleDelete}
      navigate={navigate}
    />
  );
}