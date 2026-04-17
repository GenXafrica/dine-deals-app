import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Mail, Phone, MapPin, Globe, Calendar, Clock, Image, User } from 'lucide-react';

interface Merchant {
  id: string;
  manager_name: string;
  restaurant_name: string;
  email: string;
  email_verified: boolean;
  phone?: string;
  street_address?: string;
  city?: string;
  postal_code?: string;
  website?: string;
  cuisine_type?: string;
  description?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  business_hours?: any;
  created_at: string;
}

interface MerchantProfileViewProps {
  merchant: Merchant;
}

export default function MerchantProfileView({ merchant }: MerchantProfileViewProps) {
  return (
    <Card className="border-amber-200 bg-white/95 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-b border-amber-100">
        <CardTitle className="flex items-center gap-3 text-amber-700">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Store className="w-5 h-5 text-amber-600" />
          </div>
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Manager's Name</span>
            </div>
            <p className="text-gray-900 font-medium">{merchant.manager_name || 'Not provided'}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Restaurant Name</span>
            </div>
            <p className="text-gray-900 font-medium">{merchant.restaurant_name}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Email</span>
              <Badge variant={merchant.email_verified ? 'default' : 'destructive'} className={merchant.email_verified ? 'bg-green-100 text-green-700' : ''}>
                {merchant.email_verified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
            <p className="text-gray-900">{merchant.email}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Phone</span>
            </div>
            <p className="text-gray-900">{merchant.phone || 'Not provided'}</p>
          </div>
          
          {merchant.cuisine_type && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Cuisine Type</span>
              </div>
              <p className="text-gray-900">{merchant.cuisine_type}</p>
            </div>
          )}
          
          {merchant.website && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Website</span>
              </div>
              <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {merchant.website}
              </a>
            </div>
          )}
        </div>
        
        {(merchant.street_address || merchant.city || merchant.postal_code) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Address</span>
            </div>
            <p className="text-gray-900">
              {[merchant.street_address, merchant.city, merchant.postal_code].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
        
        {merchant.description && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Description</span>
            </div>
            <p className="text-gray-900">{merchant.description}</p>
          </div>
        )}
        
        {merchant.logo_url && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Logo</span>
            </div>
            <img src={merchant.logo_url} alt="Restaurant Logo" className="w-16 h-16 object-cover rounded-lg" />
          </div>
        )}
        
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Member Since</span>
          </div>
          <p className="text-gray-900">{new Date(merchant.created_at).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}