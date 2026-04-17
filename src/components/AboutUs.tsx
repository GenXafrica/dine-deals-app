import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  MapPin,
  Bell,
  Utensils,
  Mail,
  Facebook,
  Instagram,
  BookOpen,
  User,
  Store,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AboutUs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-[100dvh] overflow-y-auto p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mr-4 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">About us</h1>
        </div>

        <Card className="mb-8 overflow-hidden bg-white">
          <div className="relative">
            <img
              src="https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/about.jpg"
              alt="People enjoying food"
              className="w-full h-64 object-cover"
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.35))',
              }}
            >
              <div className="text-center text-white">
                <h2 className="text-4xl font-bold mb-2">
                  Eat well, Spend less!
                </h2>
                <p className="text-xl text-white/95">
                  Never miss a meal deal again
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-3 bg-white">
          <CardContent className="p-8 pb-2">

            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              With Dine Deals, great-value offers from your favourite local restaurants and coffee shops are always within reach.
            </p>

            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              Here's how Dine Deals helps you save and discover:
            </h3>

            <div className="grid md:grid-cols-3 gap-6 mb-8">

              <div className="flex items-start space-x-3">
                <Utensils className="h-6 w-6 mt-1" style={{ color: '#FBB345' }} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Amazing Deals</h4>
                  <p className="text-gray-600">
                    Daily specials and great-value offers.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="h-6 w-6 mt-1" style={{ color: '#FBB345' }} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Local Discovery</h4>
                  <p className="text-gray-600">
                    Deals within 3, 5, and 10 km of you.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Bell className="h-6 w-6 mt-1" style={{ color: '#FBB345' }} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Real-time Alerts</h4>
                  <p className="text-gray-600">
                    Instant notifications when deals go live.
                  </p>
                </div>
              </div>

            </div>

            <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg text-center mb-6">
              <p className="text-lg font-semibold text-orange-800">
                Registration is FREE. Get started today.
              </p>
            </div>

            <div className="text-center mb-8">
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 text-white hover:bg-green-700 py-3 text-sm font-semibold"
                size="lg"
              >
                Get started!
              </Button>
            </div>

            {/* USER GUIDES */}
            <div className="text-center mb-6">

              <div className="flex items-center justify-center mb-4 space-x-2">
                <BookOpen className="h-5 w-5 text-gray-700" />
                <h3 className="text-xl font-semibold text-gray-900">
                  User Guides
                </h3>
              </div>

              <div className="space-y-3">

                {/* CUSTOMER GUIDE */}
                <div
                  onClick={() => navigate('/customer-guide')}
                  className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5" style={{ color: '#FBB345' }} />
                    <span className="font-medium text-gray-800">
                      Diner Quick Guide
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

                {/* MERCHANT GUIDE */}
                <div
                  onClick={() => navigate('/merchant-guide')}
                  className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Store className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-800">
                      Restaurant Quick Guide
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

              </div>
            </div>

            {/* CONTACT */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Contact us
              </h3>

              <div className="flex items-center justify-center space-x-6">

                <a
                  href="mailto:info@dinedeals.co.za"
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Mail className="h-6 w-6" />
                </a>

                <a
                  href="https://wa.me/27620128252"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-800"
                >
                  {/* WhatsApp SVG unchanged */}
                  <svg
  viewBox="0 0 16 16"
  className="h-6 w-6"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M13.601 2.326A7.85 7.85 0 0 0 8.014 0C3.59 0 0 3.582 0 8c0 1.414.37 2.794 1.073 4.01L0 16l4.102-1.063A8.02 8.02 0 0 0 8.014 16C12.438 16 16 12.418 16 8a7.93 7.93 0 0 0-2.399-5.674ZM8.014 14.66a6.66 6.66 0 0 1-3.394-.93l-.244-.145-2.434.63.65-2.37-.159-.243A6.61 6.61 0 0 1 1.354 8c0-3.68 2.99-6.674 6.66-6.674A6.62 6.62 0 0 1 14.66 8c0 3.68-2.99 6.66-6.646 6.66Zm3.65-4.992c-.2-.1-1.183-.584-1.367-.65-.184-.067-.317-.1-.45.1-.133.2-.517.65-.634.784-.117.134-.234.15-.434.05-.2-.1-.844-.31-1.607-.99-.593-.528-.993-1.18-1.11-1.38-.117-.2-.012-.308.088-.407.09-.09.2-.234.3-.35.1-.117.133-.2.2-.334.067-.133.034-.25-.017-.35-.05-.1-.45-1.084-.617-1.484-.162-.39-.326-.337-.45-.343l-.384-.007c-.133 0-.35.05-.534.25-.184.2-.7.684-.7 1.667 0 .984.717 1.934.817 2.067.1.133 1.41 2.15 3.414 3.016.477.206.85.329 1.14.42.479.152.915.13 1.26.079.384-.057 1.183-.484 1.35-.95.167-.467.167-.867.117-.95-.05-.084-.184-.134-.384-.234Z" />
</svg>
                </a>

                <a
                  href="https://facebook.com/appgenx.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Facebook className="h-6 w-6" />
                </a>

                <a
                  href="https://instagram.com/appgenx.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Instagram className="h-6 w-6" />
                </a>

              </div>
            </div>

            <div className="text-center text-sm text-gray-500 border-t pt-2">

              <a
                href="https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/documents/legal-information.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-colors hover:text-blue-400 active:text-blue-500"
              >
                Legal Information
              </a>

              <div className="mt-1">© Dine Deals 2025–2026</div>

              <a
                href="https://appgenx.co.za/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-blue-400 active:text-blue-500"
              >
                Powered by Appgenx
              </a>

            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};