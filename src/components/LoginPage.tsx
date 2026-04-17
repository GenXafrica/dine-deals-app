import React, { useEffect, useState } from 'react';
import { NewLoginForm } from './NewLoginForm';
import { NewRegisterForm } from './NewRegisterForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface LoginPageProps {
  onBack?: () => void;
  onSuccess?: () => void;
  userType?: 'customer' | 'merchant' | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBack,
  onSuccess,
  userType,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reset') === 'success') {
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) return;

      const { data: status, error } = await supabase
        .rpc('get_user_signin_status')
        .maybeSingle();

      if (error || !status) {
        navigate('/login', { replace: true });
        return;
      }

      if (status.role === 'merchant') {
        navigate(
          status.profile_complete ? '/merchant-dashboard' : '/merchant-profile',
          { replace: true }
        );
        return;
      }

      if (status.role === 'customer') {
        navigate(
          status.profile_complete ? '/customer-dashboard' : '/customer-profile',
          { replace: true }
        );
        return;
      }

      navigate('/login', { replace: true });
    };

    check();
  }, [navigate]);

  const handleLoginSuccess = async () => {
    if (onSuccess) onSuccess();
  };

  const handleRegisterSuccess = () => {
    handleLoginSuccess();
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  return (
    <div
      className="min-h-[100dvh] overflow-x-hidden flex items-start justify-center p-4 pt-6 pb-6 relative"
      style={{
        backgroundImage:
          'url(https://d64gsuwffb70l.cloudfront.net/683946324043f54d19950def_1748861800257_a5c9db4d.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40 -z-10"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 flex justify-start">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-white hover:bg-white/20 p-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            Welcome to Dine Deals
          </h1>
          <p className="text-white text-lg drop-shadow-md">
            Sign in or create an account
          </p>
        </div>

        <div className="bg-[#F3F4F6] rounded-lg shadow-2xl">
          <Tabs
            value={authMode}
            onValueChange={(value) =>
              setAuthMode(value as 'login' | 'register')
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-[#F3F4F6] rounded-t-lg p-0">
              <TabsTrigger
                value="login"
                className="rounded-none py-3 text-gray-500 data-[state=active]:text-black data-[state=active]:shadow-[inset_0_-3px_0_0_#16a34a]"
              >
                Sign in
              </TabsTrigger>

              <TabsTrigger
                value="register"
                className="rounded-none py-3 text-gray-500 data-[state=active]:text-black data-[state=active]:shadow-[inset_0_-3px_0_0_#16a34a]"
              >
                Sign up
              </TabsTrigger>
            </TabsList>

            <div className="bg-white rounded-b-lg p-6 transition-all duration-200">
              <TabsContent
                value="login"
                className="data-[state=inactive]:hidden data-[state=active]:block"
              >
                <NewLoginForm
                  onSuccess={handleLoginSuccess}
                  userType={userType}
                />
              </TabsContent>

              <TabsContent
                value="register"
                className="data-[state=inactive]:hidden data-[state=active]:block"
              >
                <NewRegisterForm
                  onSuccess={handleRegisterSuccess}
                  userType={userType}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};