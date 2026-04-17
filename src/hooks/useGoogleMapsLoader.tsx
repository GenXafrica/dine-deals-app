import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface UseGoogleMapsLoaderOptions {
  apiKey?: string;
  libraries?: string[];
}

export const useGoogleMapsLoader = (options: UseGoogleMapsLoaderOptions = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef<Loader | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const loadGoogleMaps = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get API key from environment or options
        const apiKey = options.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          throw new Error('Google Maps API key not found');
        }

        // Create loader instance
        const loader = new Loader({
          apiKey,
          libraries: options.libraries || ['places'],
          version: 'weekly'
        });

        loaderRef.current = loader;

        // Load the Google Maps API
        await loader.load();
        
        setIsLoaded(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load Google Maps';
        setError(errorMessage);
        console.error('Google Maps loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoogleMaps();
  }, [options.apiKey, options.libraries]);

  return {
    isLoaded,
    isLoading,
    error,
    loader: loaderRef.current
  };
};