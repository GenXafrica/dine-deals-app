import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PhoneInput } from '@/components/PhoneInput';
import { AddressInput } from '@/components/AddressInput';
import { supabase } from '@/lib/supabase';

import { toast } from '@/hooks/use-toast';

interface Merchant {
  id: string;
  manager_name: string;
  restaurant_name: string;
  email: string;
  phone?: string;
  address?: string;
  email_verified: boolean;
  created_at: string;
}

interface EditMerchantDialogProps {
  merchant: Merchant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function EditMerchantDialog({ merchant, open, onOpenChange, onUpdate }: EditMerchantDialogProps) {
  const [ownerName, setOwnerName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (merchant) {
      setOwnerName(merchant.manager_name || '');
      setRestaurantName(merchant.restaurant_name || '');
      setEmail(merchant.email || '');
      setPhone(merchant.phone || '');
      setAddress(merchant.address || '');
      setEmailVerified(merchant.email_verified || false);
    }
  }, [merchant]);

  const handleSave = async () => {
    if (!merchant) return;
    
    setLoading(true);
    try {
      const { error } = await supabase

        .from('merchants')
        .update({
          manager_name: ownerName,
          restaurant_name: restaurantName,
          email: email,
          phone: phone,
          address: address,
          email_verified: emailVerified
        })
        .eq('id', merchant.id);

      if (error) {
        throw new Error(`Failed to update merchant: ${error.message}`);
      }

      toast({
        title: 'Success',
        description: 'Merchant updated successfully'
      });
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update merchant',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!merchant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-label="Edit merchant information dialog">
        <DialogHeader>
          <DialogTitle>Edit Merchant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <Label htmlFor="restaurantName">Restaurant Name</Label>
            <Input
              id="restaurantName"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ownerName">Owner Name</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="Enter phone number"
          />
          <AddressInput
            value={address}
            onChange={setAddress}
            placeholder="Enter restaurant address"
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="emailVerified"
              checked={emailVerified}
              onCheckedChange={setEmailVerified}
            />
            <Label htmlFor="emailVerified">Email Verified</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}