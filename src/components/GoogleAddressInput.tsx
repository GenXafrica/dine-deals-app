import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GoogleAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

interface AddressSuggestion {
  description: string;
  place_id: string;
}

export const GoogleAddressInput: React.FC<GoogleAddressInputProps> = ({
  value,
  onChange,
  placeholder = "Search for address...",
  className = "",
  required = false
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setInputValue(value);
    setSelectedAddress(value);
  }, [value]);

  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Mock Google Places API response for demo
      const mockSuggestions: AddressSuggestion[] = [
        {
          description: `${query}, Cape Town, South Africa`,
          place_id: 'mock_1'
        },
        {
          description: `${query}, Johannesburg, South Africa`,
          place_id: 'mock_2'
        },
        {
          description: `${query}, Durban, South Africa`,
          place_id: 'mock_3'
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
    
    // Clear selected address if user types something different
    if (newValue !== selectedAddress) {
      setSelectedAddress('');
      onChange('');
    }

    // Debounce search
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.description);
    setSelectedAddress(suggestion.description);
    onChange(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow click
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const isValidAddress = selectedAddress && selectedAddress === inputValue;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Address
        {required && <span className="text-red-500">*</span>}
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
            required && !isValidAddress ? 'border-red-500' : ''
          } ${
            isValidAddress ? 'border-green-500' : ''
          }`}
          placeholder={placeholder}
          required={required}
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
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
      
      {required && !isValidAddress && inputValue && (
        <p className="text-xs text-red-500">
          Please select an address from the suggestions
        </p>
      )}
      
      {isValidAddress && (
        <p className="text-xs text-green-600">
          ✓ Address selected from Google Maps
        </p>
      )}
    </div>
  );
};