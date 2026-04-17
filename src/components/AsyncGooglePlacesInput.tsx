import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';

interface AsyncGooglePlacesInputProps {
  value: string;
  onChange: (value: string, placeId?: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  label?: string;
}

interface PlaceSuggestion {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export const AsyncGooglePlacesInput: React.FC<AsyncGooglePlacesInputProps> = ({
  value,
  onChange,
  placeholder = "Search for your business address...",
  className = "",
  required = false,
  label = "Google Maps Address"
}) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const serviceRef = useRef<any>(null);
  
  const { isLoaded: isMapsReady, isLoading: mapsLoading, error } = useGoogleMapsLoader();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (isMapsReady && typeof window !== 'undefined' && window.google?.maps?.places) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
      getCurrentLocation();
    }
  }, [isMapsReady]);

  const getCurrentLocation = () => {
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
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3 || !isMapsReady || !serviceRef.current) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const request: any = {
        input: query,
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'za' },
        sessionToken: new window.google.maps.places.AutocompleteSessionToken()
      };

      if (userLocation) {
        request.location = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
        request.radius = 50000;
        request.strictBounds = false;
      }

      serviceRef.current.getPlacePredictions(
        request,
        (predictions: any[], status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const filteredPredictions = predictions.filter(prediction => {
              const types = prediction.types || [];
              return types.includes('establishment') || 
                     types.includes('point_of_interest') ||
                     types.includes('store') ||
                     types.includes('restaurant') ||
                     types.includes('food') ||
                     types.includes('meal_takeaway') ||
                     types.includes('meal_delivery');
            });
            setSuggestions(filteredPredictions.length > 0 ? filteredPredictions : predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
          setIsSearching(false);
        }
      );
    } catch (error) {
      console.error('Error searching places:', error);
      toast({
        title: 'Error',
        description: 'Failed to search addresses',
        variant: 'destructive'
      });
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (selectedPlaceId) {
      setSelectedPlaceId(null);
      onChange(newValue);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: PlaceSuggestion) => {
    setInputValue(suggestion.description);
    setSelectedPlaceId(suggestion.place_id);
    onChange(suggestion.description, suggestion.place_id);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const isValidSelection = selectedPlaceId && inputValue;

  // Show loading state while Google Maps is loading
  if (mapsLoading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <Loader2 className="absolute right-3 top-3 w-4 h-4 text-gray-400 animate-spin" />
          <Input
            className="pl-10 pr-10 bg-gray-50"
            placeholder="Loading Google Maps..."
            disabled
          />
        </div>
        <p className="text-xs text-gray-500">Loading Google Maps...</p>
      </div>
    );
  }

  // Show error state if Google Maps failed to load
  if (error) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange(e.target.value);
            }}
            className={`pl-10 ${className}`}
            placeholder={placeholder}
            required={required}
          />
        </div>
        <p className="text-xs text-red-500">Google Maps unavailable. You can still enter your address manually.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
        {isValidSelection ? (
          <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
        ) : isSearching ? (
          <Loader2 className="absolute right-3 top-3 w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
        )}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={`pl-10 pr-10 ${className} ${
            required && !isValidSelection ? 'border-red-500' : ''
          } ${
            isValidSelection ? 'border-green-500' : ''
          }`}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => {
              const isBusinessListing = suggestion.types?.some(type => 
                ['establishment', 'point_of_interest', 'store', 'restaurant', 'food'].includes(type)
              );
              
              return (
                <div
                  key={suggestion.place_id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className={`w-4 h-4 mt-0.5 ${
                      isBusinessListing ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        isBusinessListing ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {suggestion.structured_formatting?.main_text || suggestion.description}
                        {isBusinessListing && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Business
                          </span>
                        )}
                      </div>
                      {suggestion.structured_formatting?.secondary_text && (
                        <div className="text-xs text-gray-500">
                          {suggestion.structured_formatting.secondary_text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {required && !isValidSelection && inputValue && (
        <p className="text-xs text-red-500">
          Please select an address from the Google Maps suggestions
        </p>
      )}
      
      {isValidSelection && (
        <p className="text-xs text-green-600">
          ✓ Official Google Maps address selected
        </p>
      )}
    </div>
  );
};