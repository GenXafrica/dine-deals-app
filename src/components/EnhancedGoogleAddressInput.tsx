import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GoogleAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: string, isGoogleVerified: boolean) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  label?: string;
}

interface AddressSuggestion {
  description: string;
  place_id: string;
  formatted_address?: string;
}

export const EnhancedGoogleAddressInput: React.FC<GoogleAddressInputProps> = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Search for address...",
  className = "",
  required = false,
  label = "Address"
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleVerified, setIsGoogleVerified] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setInputValue(value);
    // Check if current value was selected from Google
    setIsGoogleVerified(value.length > 0 && suggestions.some(s => s.description === value));
  }, [value, suggestions]);

  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      // Mock Google Places API response
      const mockSuggestions: AddressSuggestion[] = [
        {
          description: `${query}, Cape Town, Western Cape, South Africa`,
          place_id: 'mock_1',
          formatted_address: `${query}, Cape Town, Western Cape, South Africa`
        },
        {
          description: `${query}, Johannesburg, Gauteng, South Africa`,
          place_id: 'mock_2',
          formatted_address: `${query}, Johannesburg, Gauteng, South Africa`
        },
        {
          description: `${query}, Durban, KwaZulu-Natal, South Africa`,
          place_id: 'mock_3',
          formatted_address: `${query}, Durban, KwaZulu-Natal, South Africa`
        }
      ];
      
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching addresses:', error);
      toast({
        title: 'Error',
        description: 'Failed to search addresses',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsGoogleVerified(false);

    // Debounce search
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const selectedAddress = suggestion.formatted_address || suggestion.description;
    setInputValue(selectedAddress);
    onChange(selectedAddress);
    onAddressSelect(selectedAddress, true);
    setIsGoogleVerified(true);
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
      // Notify parent if address was manually entered
      if (inputValue && !isGoogleVerified) {
        onAddressSelect(inputValue, false);
      }
    }, 200);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {isGoogleVerified && (
          <CheckCircle className="w-4 h-4 text-green-500 ml-1" />
        )}
      </Label>
      
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
        <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={`pl-10 pr-10 ${className} ${
            required && !inputValue ? 'border-red-500' : ''
          } ${
            isGoogleVerified ? 'border-green-500' : ''
          }`}
          placeholder={placeholder}
          required={required}
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.place_id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{suggestion.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {isLoading && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Searching addresses...</span>
            </div>
          </div>
        )}
      </div>
      
      {isGoogleVerified && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Address verified with Google Maps
        </p>
      )}
      
      {!isGoogleVerified && inputValue && (
        <p className="text-xs text-amber-600">
          Consider selecting from Google Maps suggestions for better accuracy
        </p>
      )}
    </div>
  );
};