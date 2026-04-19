import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DummyMerchant {
  id: string;
  name: string;
  restaurant_name: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  is_dummy: boolean;
}

export function DummyMerchantManager() {
  const [dummyMerchants, setDummyMerchants] = useState<DummyMerchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const loadDummyMerchants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, name, restaurant_name, category, email, phone, address, is_dummy')
        .eq('is_dummy', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDummyMerchants(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dummy merchants',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAllDummyMerchants = async () => {
    setDeleting(true);
    try {
      // First get all deals for these merchants
      const { data: deals, error: dealsQueryError } = await supabase
        .from('deals')
        .select('id')
        .in('merchant_id', dummyMerchants.map(m => m.id));

      if (dealsQueryError) throw dealsQueryError;

      // Delete each deal using RPC
      if (deals && deals.length > 0) {
        for (const deal of deals) {
          const { error: dealDeleteError } = await supabase.rpc('update_deal', {
            p_deal_id: deal.id,
            p_is_active: false,
            p_deleted_at: new Date().toISOString()
          });
          if (dealDeleteError) throw dealDeleteError;
        }
      }

      // Then delete merchants
      const { error: merchantsError } = await supabase
        .from('merchants')
        .delete()
        .eq('is_dummy', true);

      if (merchantsError) throw merchantsError;

      setDummyMerchants([]);
      toast({
        title: 'Success',
        description: `Deleted ${dummyMerchants.length} dummy merchants and their deals`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete dummy merchants',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  React.useEffect(() => {
    loadDummyMerchants();
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Dummy Merchant Manager
        </CardTitle>
        <CardDescription>
          Manage placeholder merchant profiles created for testing purposes.
          These should be deleted before going live.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Button onClick={loadDummyMerchants} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          
          {dummyMerchants.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Dummy Merchants
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Dummy Merchants?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {dummyMerchants.length} dummy merchants and all their associated deals.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAllDummyMerchants} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete All'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {dummyMerchants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No dummy merchants found
          </div>
        ) : (
          <div className="grid gap-4">
            {dummyMerchants.map((merchant) => (
              <div key={merchant.id} className="border rounded-lg p-4 bg-orange-50">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{merchant.restaurant_name}</h3>
                      <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                        DUMMY
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{merchant.category}</p>
                    <p className="text-sm">{merchant.email}</p>
                    <p className="text-sm">{merchant.phone}</p>
                    <p className="text-sm text-gray-600">{merchant.address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}