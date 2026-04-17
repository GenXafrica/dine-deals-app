// src/components/MerchantDashboardProfile.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit } from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import LogoutButton from '../LogoutButton';

const RESTAURANT_CATEGORIES = [
  'American', 'Bakery', 'BBQ', 'Brazilian', 'British', 'Cafe', 'Chinese', 'Ethiopian',
  'Fast Food', 'French', 'German', 'Greek', 'Indian', 'International', 'Italian',
  'Japanese', 'Korean', 'Lebanese', 'Mediterranean', 'Mexican', 'Moroccan', 'Other',
  'Pizza', 'Seafood', 'Spanish', 'Steakhouse', 'Thai', 'Turkish', 'Vegan',
  'Vegetarian', 'Vietnamese'
];

interface MerchantDashboardProfileProps {
  editing: boolean;
  formData: {
    logo: string;
    restaurantName: string;
    address: string;
    category: string;
    website: string;
    phone: string;
    email: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  onEdit: () => void;
}

export const MerchantDashboardProfile: React.FC<MerchantDashboardProfileProps> = ({
  editing,
  formData,
  setFormData,
  onSave,
  onEdit
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Restaurant Profile</CardTitle>
            <CardDescription>Manage your restaurant information</CardDescription>
          </div>

          {/* Buttons: Logout above, Edit Profile green, stacked and full width on small screens */}
          <div className="flex flex-col gap-2 w-full sm:w-64 items-stretch">

            <LogoutButton className="w-full" />

            <Button
              onClick={() => (editing ? onSave() : onEdit())}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              type="button"
            >
              {editing ? 'Save Changes' : (
                <>
                  <Edit className="w-4 h-4 mr-2" /> Edit Profile
                </>
              )}
            </Button>
          </div>
          {/* end buttons block */}

        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Restaurant Name *</Label>
            <Input
              id="restaurantName"
              value={formData.restaurantName}
              onChange={(e) => setFormData(prev => ({ ...prev, restaurantName: e.target.value }))}
              disabled={!editing}
              placeholder="Joe's Coffee Shop"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value, cuisine_type: value }))}
              disabled={!editing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {RESTAURANT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Street Address (Google Maps format) *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={!editing}
              placeholder="123 Main Street, Johannesburg, Gauteng, South Africa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              disabled={!editing}
              placeholder="+27xxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={!editing}
              placeholder="contact@restaurant.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              disabled={!editing}
              placeholder="https://myrestaurantwebsite.com"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <ImageUpload
              label="Restaurant Logo (500x500px)"
              value={formData.logo}
              onChange={(url) => setFormData(prev => ({ ...prev, logo: url }))}
              disabled={!editing}
              placeholder="Upload logo or enter URL"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantDashboardProfile;
