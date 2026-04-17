// src/components/DealsList.tsx
import React from "react";
import DealCard from "@/components/DealCard";

type Deal = {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  images?: any;
  price?: number | string | null;
  merchant_id?: string;
  merchants?: any;
  ends_at?: string;
};

type Props = {
  deals: Deal[];
  onDelete: (dealId: string) => void;
  deletingDealId: string | null;
  loading: boolean;
};

const BOTTOM_RESERVED_PX = 160;

const DealsList: React.FC<Props> = ({
  deals,
  onDelete,
  deletingDealId,
  loading,
}) => {
  if (loading && deals.length === 0) {
    return <div className="text-center py-4">Loading deals...</div>;
  }

  if (deals.length === 0) {
    return <div className="text-center py-4 text-gray-500">No deals found.</div>;
  }

  return (
    <div className="space-y-4" style={{ paddingBottom: BOTTOM_RESERVED_PX }}>
      {deals.map((deal) => (
        <DealCard
          key={deal.id}
          deal={deal}
        />
      ))}
    </div>
  );
};

export default DealsList;