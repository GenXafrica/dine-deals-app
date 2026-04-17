import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: {
    formatted_address: string;
    place_id: string;
    lat: number;
    lng: number;
  }) => void;
  placeholder?: string;
  className?: string;
}

export const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing an address...",
  className
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Could not get user location:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    const loadMaps = async () => {
      try {
        await loadGoogleMaps();
        initializeAutocomplete();
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setHasError(true);
      }
    };

    const initializeAutocomplete = () => {
      if (!inputRef.current || !window.google) return;

      const options: google.maps.places.AutocompleteOptions = {
        types: ['restaurant', 'cafe', 'meal_takeaway']
      };

      if (userLocation) {
        options.locationBias = {
          center: { lat: userLocation.lat, lng: userLocation.lng },
          radius: 5000 // 5 km radius
        };
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place && place.geometry && place.geometry.location) {
          const placeData = {
            formatted_address: place.formatted_address || '',
            place_id: place.place_id || '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          };

          onChange(place.formatted_address || '');
          onPlaceSelect(placeData);
        }
      });
    };

    loadMaps();

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange, onPlaceSelect, userLocation]);

  return (
    <div>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hasError ? "Enter address manually" : (isLoaded ? placeholder : "Loading address suggestions...")}
        className={className}
        disabled={hasError ? false : !isLoaded}
      />
      {hasError && (
        <p className="text-sm text-gray-500 mt-1">
          Google Maps unavailable
        </p>
      )}
    </div>
  );
};
