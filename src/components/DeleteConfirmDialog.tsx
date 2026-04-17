import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'customer' | 'merchant';
  item: { id: string; name: string; user_id?: string } | null;
  onDelete: () => void | Promise<void>;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  type,
  item,
  onDelete,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), ms)
      ),
    ]);
  };

  const handleDelete = async () => {
    if (!item) return;
    if (loading) return;

    setLoading(true);

    try {
      const table = type === 'customer' ? 'customers' : 'merchants';

      const { data: recordData, error: fetchError } = await withTimeout(
        supabase.from(table).select('user_id').eq('id', item.id).maybeSingle(),
        15000
      );

      if (fetchError) throw fetchError;

      const { error: tableError } = await withTimeout(
        supabase.from(table).delete().eq('id', item.id),
        15000
      );

      if (tableError) throw tableError;

      if (recordData?.user_id) {
        await withTimeout(
          supabase.from('users').delete().eq('id', recordData.user_id),
          15000
        );
      }

      toast({
        title: 'Success',
        description: `"${item.name}" has been deleted successfully`,
        duration: 3000,
      });

      await onDelete();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error?.message || `Failed to delete ${type}`,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[80%] max-w-sm sm:max-w-md rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Confirm Deletion
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Are you sure you want to delete <strong>"{item.name}"</strong>?
            <br />
            <br />
            <span className="text-red-600 font-medium">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>

          <AlertDialogAction asChild>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white px-4 py-2 rounded-md"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteConfirmDialog;
