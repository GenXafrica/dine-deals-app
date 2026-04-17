import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

export const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // show toast FIRST
    toast({
      title: "Payment successful",
      description: "Your subscription has been updated",
    });

    // short delay so toast is visible
    const timer = setTimeout(() => {
      navigate("/merchant-dashboard?payment=success", { replace: true });
    }, 1200);

    return () => clearTimeout(timer);
  }, [navigate]);

  return null;
};

export default PaymentSuccess;