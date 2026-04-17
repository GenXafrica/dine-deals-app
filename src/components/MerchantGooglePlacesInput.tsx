import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';

interface MerchantGooglePlacesInputProps {
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

export const MerchantGooglePlacesInput: React.FC<MerchantGooglePlacesInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing a business address...",
  className
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isValidSelection, setIsValidSelection] = useState(false);
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

          setIsValidSelection(true);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsValidSelection(false);
    onChange(e.target.value);
  };

  return (
    <div>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        placeholder={hasError ? "Enter address manually" : (isLoaded ? placeholder : "Loading...")}
        className={`${className} ${!isValidSelection && value ? 'border-orange-400' : ''}`}
        disabled={!isLoaded && !hasError}
      />
      {!isValidSelection && value && isLoaded && (
        <p className="text-sm text-orange-600 mt-1">
          Please select a business from the dropdown suggestions
        </p>
      )}
      {hasError && (
        <p className="text-sm text-gray-500 mt-1">
          Google Maps unavailable - enter address manually
        </p>
      )}
    </div>
  );
};
