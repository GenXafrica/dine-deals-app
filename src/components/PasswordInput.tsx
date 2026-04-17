import React from 'react';
import { Input } from '@/components/ui/input';

interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  value,
  onChange,
  placeholder = '••••••••',
  className,
  required
}) => {
  return (
    <Input
      id={id}
      type="password"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      required={required}
    />
  );
};