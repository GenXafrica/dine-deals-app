import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Utensils, Store } from "lucide-react";

interface RegistrationConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  accountType: "customer" | "merchant";
  email: string;
  onConfirm: () => void;
  loading?: boolean;
}

export const RegistrationConfirmationModal: React.FC<
  RegistrationConfirmationModalProps
> = ({
  open,
  onClose,
  accountType,
  email,
  onConfirm,
  loading = false,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const confirmLockRef = useRef(false);
  const navigate = useNavigate();

  const isDiner = accountType === "customer";
  const displayAccountType = isDiner ? "Diner" : "Restaurant";
  const Icon = isDiner ? Utensils : Store;

  const handleCancel = () => {
    if (loading || submitting || confirmLockRef.current) return;
    setConfirmed(false);
    onClose();
    navigate("/");
  };

  const handleConfirm = () => {
    if (!confirmed || loading || submitting || confirmLockRef.current) return;

    confirmLockRef.current = true;
    setSubmitting(true);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-sm w-[92vw] rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Confirm Your Account
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Tap box below to confirm your details.
          </p>
        </DialogHeader>

        <div
          onClick={() => {
            if (loading || submitting || confirmLockRef.current) return;
            setConfirmed(true);
          }}
          className={`
            mt-3 rounded-xl border border-gray-300 overflow-hidden cursor-pointer
            transition-all bg-[#F3F4F6] shadow-sm relative
            ${confirmed ? "ring-2 ring-green-600" : ""}
          `}
        >
          {confirmed && (
            <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-600" />
          )}

          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2 pr-6">
              <Icon className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Account Type
                </p>
                <p className="font-semibold text-sm">
                  {displayAccountType}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Email
              </p>
              <p className="font-semibold text-sm break-words">
                {email}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!confirmed || loading || submitting || confirmLockRef.current}
            className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white"
          >
            {loading || submitting || confirmLockRef.current ? "Creating..." : "Create Account"}
          </Button>

          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full rounded-lg"
            disabled={loading || submitting || confirmLockRef.current}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
