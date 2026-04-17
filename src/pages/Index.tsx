import React, { useEffect } from "react";
import { AuthWrapper } from "@/components/AuthWrapper";
import { supabase } from "@/lib/supabase";

const Home: React.FC = () => {
  useEffect(() => {
    const handleRecovery = async () => {
      const fullUrl = window.location.href;

      if (fullUrl.includes("/auth/callback")) return;

      const isRecovery =
        fullUrl.includes("type=recovery") ||
        fullUrl.includes("access_token");

      if (!isRecovery) return;

      const { data } = await supabase.auth.getSession();

      if (!data?.session) {
        setTimeout(handleRecovery, 300);
        return;
      }

      window.location.replace("/#/reset-password");
    };

    handleRecovery();
  }, []);

  return <AuthWrapper />;
};

export default Home;