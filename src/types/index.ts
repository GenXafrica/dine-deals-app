export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  type: 'customer' | 'merchant';
  mobileNumber?: string;
  createdAt: Date;
  justCompleted?: boolean; // Flag to indicate profile was just completed
}

export interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  city?: string;
  password: string;
  created_at?: Date;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  validUntil: Date;
  image?: string;
  images?: string[]; // Array of 3 thumbnail images
}

export interface Merchant {
  id: string;
  ownerName: string; // This maps to manager_name in database
  name: string; // Restaurant name
  restaurantName: string;
  email: string;
  password: string;
  logo?: string;
  address: string;
  city: string;
  category?: string;
  deals: Deal[];
  website?: string;
  phone: string;
  phoneNumber: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  merchant: Merchant | null;
  isAuthenticated: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'Starter' | 'Main' | 'Chef';
  billing_cycle: 'monthly' | 'annual';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  renewal_date?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percent';
  amount: number;
  expiry_date: Date;
  usage_limit?: number;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
}

export interface EmailLog {
  id: string;
  user_id: string;
  email_type: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at: Date;
}