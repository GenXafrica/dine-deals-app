import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const countries = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' }
];

export const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  placeholder = "Enter street address",
  className = ""
}) => {
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  const [userCountry, setUserCountry] = useState('US');

  useEffect(() => {
    const getUserCountry = () => {
      try {
        const locale = navigator.language || 'en-US';
        const countryCode = locale.split('-')[1] || 'US';
        setUserCountry(countryCode);
        if (!value) setCountry(countryCode);
      } catch (error) {
        setUserCountry('US');
        if (!value) setCountry('US');
      }
    };
    getUserCountry();
  }, []);

  useEffect(() => {
    if (value) {
      // Parse existing address
      const parts = value.split(', ');
      if (parts.length >= 4) {
        setStreetAddress(parts[0] || '');
        setCity(parts[1] || '');
        setState(parts[2] || '');
        setPostalCode(parts[3] || '');
        if (parts[4]) {
          const foundCountry = countries.find(c => c.name === parts[4] || c.code === parts[4]);
          if (foundCountry) setCountry(foundCountry.code);
        }
      } else {
        setStreetAddress(value);
      }
    }
  }, [value]);

  const updateAddress = (street: string, cityVal: string, stateVal: string, postal: string, countryCode: string) => {
    const selectedCountry = countries.find(c => c.code === countryCode);
    const parts = [street, cityVal, stateVal, postal, selectedCountry?.name].filter(Boolean);
    const formatted = parts.join(', ');
    onChange(formatted);
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStreet = e.target.value;
    setStreetAddress(newStreet);
    updateAddress(newStreet, city, state, postalCode, country);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCity = e.target.value;
    setCity(newCity);
    updateAddress(streetAddress, newCity, state, postalCode, country);
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = e.target.value;
    setState(newState);
    updateAddress(streetAddress, city, newState, postalCode, country);
  };

  const handlePostalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPostal = e.target.value;
    setPostalCode(newPostal);
    updateAddress(streetAddress, city, state, newPostal, country);
  };

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    updateAddress(streetAddress, city, state, postalCode, newCountry);
  };

  const selectedCountry = countries.find(c => c.code === country);

  return (
    <div className="space-y-4">
      <Label>Address</Label>
      
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
        <Input
          value={streetAddress}
          onChange={handleStreetChange}
          className={`pl-10 ${className}`}
          placeholder="Street address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          value={city}
          onChange={handleCityChange}
          placeholder="City"
        />
        <Input
          value={state}
          onChange={handleStateChange}
          placeholder="State/Province"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          value={postalCode}
          onChange={handlePostalChange}
          placeholder="Postal/ZIP code"
        />
        <Select value={country} onValueChange={handleCountryChange}>
          <SelectTrigger>
            <SelectValue>
              {selectedCountry && (
                <span className="flex items-center gap-2">
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.name}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-gray-500">
        Complete address: {streetAddress && city && state && postalCode && selectedCountry ? 
          `${streetAddress}, ${city}, ${state}, ${postalCode}, ${selectedCountry.name}` : 
          'Fill all fields for Google Maps compatibility'
        }
      </p>
    </div>
  );
};