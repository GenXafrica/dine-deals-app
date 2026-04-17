import React, { useState, useEffect, useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  error?: string;

  /**
   * When true: onChange returns digits-only full international number using the selected country code.
   * Example: +44 + 7911123456 => "447911123456"
   * When false (default): onChange returns local/national digits only (legacy behavior).
   */
  includeCountryCode?: boolean;
}

const countryCodes = [
  { code: '+27', country: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: '+1', country: 'US', name: 'United States', flag: '🇺🇸' },
  { code: '+1', country: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: '+44', country: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', country: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'FR', name: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: '+91', country: 'IN', name: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'CN', name: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: '+55', country: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: '+234', country: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', country: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: '+233', country: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: '+263', country: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+264', country: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: '+267', country: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: '+268', country: 'SZ', name: 'Eswatini', flag: '🇸🇿' }
];

const getCodeDigits = (code: string) => (code || '').replace(/\D/g, '');

const formatLoose = (digits: string) => {
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return digits;
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = '12 345 6789',
  className = '',
  required = false,
  error,
  includeCountryCode = false
}) => {
  const inputId = useId();

  const [countryCode, setCountryCode] = useState('+27');
  const [nationalDigits, setNationalDigits] = useState('');
  const [validationError, setValidationError] = useState('');

  const emitValue = (code: string, national: string) => {
    const codeDigits = getCodeDigits(code);
    const fullDigits = includeCountryCode ? `${codeDigits}${national}` : national;
    onChange(fullDigits);
  };

  const extractNational = (input: string, selectedCode: string) => {
    let digits = (input || '').replace(/\D/g, '');
    const codeDigits = getCodeDigits(selectedCode);

    if (codeDigits && digits.startsWith(codeDigits)) {
      digits = digits.slice(codeDigits.length);
    }

    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    const maxNational = Math.max(0, 15 - codeDigits.length);
    return digits.slice(0, maxNational);
  };

  useEffect(() => {
    const incomingDigits = (value || '').replace(/\D/g, '');

    if (!incomingDigits) {
      setNationalDigits('');
      setValidationError('');
      return;
    }

    if (includeCountryCode) {
      const sorted = [...countryCodes].sort(
        (a, b) => getCodeDigits(b.code).length - getCodeDigits(a.code).length
      );

      let matchedCode = countryCode;
      let remaining = incomingDigits;

      for (const c of sorted) {
        const cd = getCodeDigits(c.code);
        if (cd && incomingDigits.startsWith(cd)) {
          matchedCode = c.code;
          remaining = incomingDigits.slice(cd.length);
          break;
        }
      }

      setCountryCode(matchedCode);

      const normalizedNational = extractNational(remaining, matchedCode);
      setNationalDigits(normalizedNational);
      setValidationError('');
      return;
    }

    setNationalDigits(incomingDigits.slice(0, 15));
    setValidationError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, includeCountryCode]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    const national = extractNational(input, countryCode);
    setNationalDigits(national);

    // Removed live length validation for includeCountryCode
// ✅ Remove live validation while typing
setValidationError('');

    emitValue(countryCode, national);
  };

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const national = extractNational(nationalDigits, newCode);
    setNationalDigits(national);
    setValidationError('');
    emitValue(newCode, national);
  };

  const selectedCountry = countryCodes.find(c => c.code === countryCode);
  const codeDigits = getCodeDigits(countryCode);
  const fullDigitsForValidation = includeCountryCode
    ? `${codeDigits}${nationalDigits}`
    : nationalDigits;

  const hasError = Boolean(error || validationError);

  return (
    <div className="space-y-0.5">
      <Label htmlFor={inputId} className="flex items-center gap-1 mb-1"></Label>

      <div className="flex gap-2 items-stretch">
        <Select value={countryCode} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-28 min-w-[7rem]">
            <SelectValue>
              {selectedCountry && (
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-lg leading-none">{selectedCountry.flag}</span>
                  <span className="font-medium">{selectedCountry.code}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {countryCodes.map((country, index) => (
              <SelectItem
                key={`${country.code}-${country.country}-${index}`}
                value={country.code}
              >
                <span className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.code}</span>
                  <span className="text-sm text-gray-500 truncate">
                    {country.name}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <Input
            id={inputId}
            value={
              countryCode === '+27'
                ? nationalDigits.replace(
                    /^(\d{2})(\d{3})(\d{0,4}).*$/,
                    (_m, a, b, c) => [a, b, c].filter(Boolean).join(' ')
                  )
                : formatLoose(nationalDigits)
            }
            onChange={handlePhoneChange}
            className={`pl-10 ${className} ${hasError ? 'border-red-500' : ''}`}
            placeholder={placeholder}
            required={required}
          />
        </div>
      </div>

      {(error || validationError) && (
        <p className="text-red-500 text-xs">
          {error || validationError}
        </p>
      )}

      {void fullDigitsForValidation}
    </div>
  );
};
