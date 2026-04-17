import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import CategoryFilter from '../../components/CategoryFilter';
import DealsList from '../../components/DealsList';

type Merchant = {
  id: string;
  category: string;
  latitude: number;
  longitude: number;
  logo?: string | null;
};

type Deal = {
  id: string;
  merchant_id?: string;
  title?: string;
  description?: string;
  image?: string | null;
  images?: string[] | null;
  price?: number | string | null;
  valid_until?: string;
  merchants?: Merchant | null;
};

const BOTTOM_RESERVED_PX = 160;
const LOCATION_INTRO_SEEN_KEY = 'dd_location_intro_seen';

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

const DealsPage: React.FC = () => {
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [showLocationIntro, setShowLocationIntro] = useState(false);

  const navigate = useNavigate();

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLatitude(null);
      setLongitude(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      },
      () => {
        setLatitude(null);
        setLongitude(null);
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

  useEffect(() => {
    let introSeen = false;

    try {
      introSeen = localStorage.getItem(LOCATION_INTRO_SEEN_KEY) === 'true';
    } catch {
      introSeen = false;
    }

    if (!introSeen) {
      setShowLocationIntro(true);
      return;
    }

    requestLocation();
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchDeals = async () => {
      setLoading(true);

      await supabase.auth.refreshSession();

      const { data, error } = await supabase
        .from('deals')
        .select(`
          id,
          merchant_id,
          title,
          description,
          price,
          valid_until,
          image,
          images,
          merchants:merchant_id (
            id,
            category,
            latitude,
            longitude,
            logo
          )
        `)
        .order('valid_until', { ascending: true })
        .throwOnError();

      if (!error && data && mounted) {
        setAllDeals(data as Deal[]);
      }

      setLoading(false);
    };

    fetchDeals();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let temp = [...allDeals];

    if (latitude == null || longitude == null) {
      setFilteredDeals([]);
      return;
    }

    if (selectedCategories.length > 0) {
      const setCat = new Set(selectedCategories.map((c) => c.toLowerCase()));

      temp = temp.filter((deal) => {
        const cat = deal.merchants?.category?.toLowerCase() || '';
        return setCat.has(cat);
      });
    }

    temp = temp.filter((deal) => {
      const m = deal.merchants;

      if (!m || m.latitude == null || m.longitude == null) return false;

      const d = haversineDistance(latitude, longitude, m.latitude, m.longitude);
      return d <= radiusKm;
    });

    setFilteredDeals(temp);
  }, [allDeals, selectedCategories, latitude, longitude, radiusKm]);

  const handleDelete = async (id: string) => {
    await supabase.from('deals').delete().eq('id', id);
    setAllDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const handleIntroAllow = () => {
    try {
      localStorage.setItem(LOCATION_INTRO_SEEN_KEY, 'true');
    } catch {}
    setShowLocationIntro(false);
    requestLocation();
  };

  const handleIntroNotNow = () => {
    try {
      localStorage.setItem(LOCATION_INTRO_SEEN_KEY, 'true');
    } catch {}
    setShowLocationIntro(false);
    setLatitude(null);
    setLongitude(null);
  };

  const handleEnableLocationClick = () => {
    try {
      localStorage.setItem(LOCATION_INTRO_SEEN_KEY, 'true');
    } catch {}
    requestLocation();
  };

  const hasLocation = latitude != null && longitude != null;

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gray-50">
      {showLocationIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-[440px] rounded-lg bg-white p-6 shadow-lg">
            <div className="text-lg font-semibold mb-2">Use your location?</div>
            <div className="text-sm text-gray-600 mb-5">
              Dine Deals uses your location to show nearby deals and filter by distance.
            </div>

            <div className="flex gap-3">
              <Button onClick={handleIntroAllow} className="bg-blue-600 text-white px-6 py-3 rounded-md flex-1">
                Allow location
              </Button>

              <Button onClick={handleIntroNotNow} className="bg-gray-300 px-6 py-3 rounded-md flex-1">
                Not now
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className="w-full max-w-[440px] mx-auto px-6 py-6 flex flex-col flex-grow"
        style={{ paddingBottom: BOTTOM_RESERVED_PX }}
      >
        <h1 className="text-lg font-semibold mb-4 text-white text-center">
          Deals Nearby
        </h1>

        <div className="mb-4">
          <CategoryFilter
            selectedCategory={selectedCategories.join(', ')}
            onCategoryChange={() => {}}
            onCategoriesChange={(cats) => setSelectedCategories(cats)}
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm text-white">Radius:</div>

          {[1, 5, 10].map((km) => (
            <button
              key={km}
              onClick={() => setRadiusKm(km)}
              className={`px-2 py-1 rounded border ${
                radiusKm === km ? 'border-green-500' : 'border-gray-200'
              }`}
              type="button"
            >
              {km} km
            </button>
          ))}
        </div>

        {!hasLocation && !loading ? (
          <div className="w-full rounded-lg bg-white p-4 shadow-sm border">
            <div className="text-sm font-semibold mb-2">
              Enable location to see nearby deals
            </div>

            <Button
              onClick={handleEnableLocationClick}
              className="bg-blue-600 text-white px-6 py-3 rounded-md w-full"
            >
              Enable location
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <DealsList
            deals={filteredDeals}
            onDelete={handleDelete}
            deletingDealId={null}
            loading={false}
          />
        )}

        <div className="mt-8 w-full border-t pt-6 flex flex-col sm:flex-row sm:justify-between gap-4">
          <Button
            onClick={() => navigate('/profile')}
            className="bg-blue-600 text-white px-6 py-3 rounded-md"
          >
            Edit Profile
          </Button>

          <Button
            onClick={() => setSelectedCategories([])}
            className="bg-gray-300 px-6 py-3 rounded-md"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DealsPage;