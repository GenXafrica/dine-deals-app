import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Trash2, ThumbsUp, Heart } from 'lucide-react';
import { EditDealDialog } from './EditDealDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { supabase } from '@/lib/supabase';

interface Deal {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  deal_number?: number;
}

interface RenderProps {
  deals: Deal[];
  dealLimit: number | null;
  addingDeal: boolean;
  setAddingDeal: (adding: boolean) => void;
  handleEditDeal: (deal: Deal) => void;
  handleDeleteDeal: (dealId: string) => Promise<void>;
  loading: boolean;
  deletingDealId: string | null;
  editingDeal: Deal | null;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  handleDealUpdated: () => void;
}

export const MerchantDashboardDealsRender: React.FC<RenderProps> = ({
  deals,
  dealLimit,
  addingDeal,
  setAddingDeal,
  handleEditDeal,
  handleDeleteDeal,
  loading,
  deletingDealId,
  editingDeal,
  editDialogOpen,
  setEditDialogOpen,
  handleDealUpdated,
}) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [engagementMap, setEngagementMap] = useState<Record<string, { like: number; love: number }>>({});

  const currentDealCount = deals.length;

  useEffect(() => {
    const loadEngagement = async () => {
      const map: Record<string, { like: number; love: number }> = {};

      for (const deal of deals) {
        const { data } = await supabase.rpc('get_deal_engagement_counts', {
          p_deal_id: deal.id,
        });

        const row = Array.isArray(data) ? data[0] : data;

        map[deal.id] = {
          like: Number(row?.like_count ?? 0),
          love: Number(row?.love_count ?? 0),
        };
      }

      setEngagementMap(map);
    };

    if (deals.length) loadEngagement();
    else setEngagementMap({});
  }, [deals]);

  if (dealLimit === null) return null;

  const canAdd = currentDealCount < dealLimit;
  const isCreateOpen = addingDeal && !editingDeal;

  const openDeleteDialog = (deal: Deal) => {
    setSelectedDeal(deal);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeal) return;
    await handleDeleteDeal(selectedDeal.id);
    setDeleteOpen(false);
    setSelectedDeal(null);
  };

  return (
    <Card className="bg-[#F3F4F6]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              My Deals {currentDealCount}/{dealLimit}
            </CardTitle>

            <CardDescription>
              Manage up to {dealLimit} deals
            </CardDescription>
          </div>

          <Button
            onClick={() => {
              setAddingDeal(true);
              handleEditDeal(null as any);
              setEditDialogOpen(true);
            }}
            disabled={!canAdd || addingDeal || loading}
          >
            Add Deal
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {deals.map((deal) => {
          const counts = engagementMap[deal.id] || { like: 0, love: 0 };

          return (
            <div
              key={deal.id}
              className="border rounded-lg p-4 bg-white"
            >
              <div className="w-full">
                <h3
                  className="font-semibold leading-tight"
                  style={{
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {deal.title}
                </h3>

                <p
                  className="text-sm text-gray-600 mt-1 leading-tight"
                  style={{
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {deal.description}
                </p>

                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <ThumbsUp size={14} color="#16A34A" fill="#16A34A" strokeWidth={0} />
                    <span className="text-green-600 font-medium">
                      {counts.like}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Heart size={14} color="#dc2626" fill="#dc2626" strokeWidth={0} />
                    <span className="text-red-600 font-medium">
                      {counts.love}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-400">
                  (Deal #{deal.deal_number ?? '-'})
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditDeal(deal)}
                    disabled={loading}
                    className="bg-blue-600 p-2 rounded text-white"
                  >
                    ✎
                  </button>

                  <button
                    onClick={() => openDeleteDialog(deal)}
                    disabled={loading || deletingDealId === deal.id}
                    className="bg-red-600 p-2 rounded text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        type="merchant"
        item={
          selectedDeal
            ? { id: selectedDeal.id, name: selectedDeal.title }
            : null
        }
        onDelete={confirmDelete}
      />

      {(editingDeal || isCreateOpen) && (
        <EditDealDialog
          key={editingDeal?.id || 'new'}
          deal={editingDeal ?? { id: 'new', title: '', description: '', is_active: true }}
          open={editDialogOpen || isCreateOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setAddingDeal(false);
            }
          }}
          onDealUpdated={() => {
            handleDealUpdated();
            setAddingDeal(false);
          }}
        />
      )}
    </Card>
  );
};

export default MerchantDashboardDealsRender;