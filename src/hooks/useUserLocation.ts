// src/hooks/useUserLocation.ts
import { useState, useEffect } from 'react';

interface Coordinates {
  lat: number;
  lng: number;
}

export function useUserLocation() {
  const [location, setLocation] = useState<Coordinates | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        console.log('User location:', coords);
        setLocation(coords);
        setLoading(false);
      },
      (err) => {
        console.error('Location error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
  }, []);

  return { location, loading, error };
}
