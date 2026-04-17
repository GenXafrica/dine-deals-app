import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

const countryCodes = [
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
];

export const PhoneInputWithCountry: React.FC<PhoneInputWithCountryProps> = ({
  value,
  onChange,
  required = false,
  className = ''
}) => {
  // Parse current value to extract country code and number
  const parsePhoneNumber = (phoneValue: string) => {
    const match = phoneValue.match(/^(\+\d{1,3})\s(.*)$/);
    if (match) {
      return { countryCode: match[1], number: match[2] };
    }
    return { countryCode: '+27', number: phoneValue.replace(/^\+\d{1,3}\s?/, '') };
  };

  const { countryCode, number } = parsePhoneNumber(value);

  const handleCountryChange = (newCountryCode: string) => {
    const formattedNumber = formatPhoneNumber(number);
    onChange(`${newCountryCode} ${formattedNumber}`);
  };

  const formatPhoneNumber = (num: string) => {
    // Remove all non-digits
    const digits = num.replace(/\D/g, '');
    
    // Format as "00 000 0000"
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedNumber = formatPhoneNumber(inputValue);
    onChange(`${countryCode} ${formattedNumber}`);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select value={countryCode} onValueChange={handleCountryChange}>
        <SelectTrigger className="w-32">
          <SelectValue>
            {countryCodes.find(c => c.code === countryCode) && (
              <span className="flex items-center gap-1">
                <span>{countryCodes.find(c => c.code === countryCode)?.flag}</span>
                <span>{countryCode}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {countryCodes.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <span className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span>{country.code}</span>
                <span className="text-sm text-gray-500">{country.country}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        value={number}
        onChange={handleNumberChange}
        placeholder="00 000 0000"
        required={required}
        className="flex-1"
        maxLength={11} // "00 000 0000" = 11 chars
      />
    </div>
  );
};