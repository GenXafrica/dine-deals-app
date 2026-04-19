import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const WireframeAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isCustomer = location.pathname === '/customer-guide';
  const isMerchant = location.pathname === '/merchant-guide';

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Button 
            onClick={handleBack}
            variant="ghost" 
            className="flex items-center gap-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <img
          src="https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/info-guide.jpg"
          alt="Guide"
          className="w-full h-40 object-cover"
        />

        <div className="py-6 px-4">
          
          {isCustomer && (
            <>
              <h1 className="text-xl font-semibold mb-4">
                Find great deals near you
              </h1>

              <h2 className="text-md font-semibold mt-4 mb-2">
                Getting Started
              </h2>

              <ol className="list-decimal pl-4 space-y-2 text-sm">
                <li>Create your account and verify your email.</li>
                <li>Complete your profile with your city and preferences.</li>
                <li>Use the distance selector (3, 5, or 10 km) to find deals.</li>
                <li>Tap a deal to view full details.</li>
                <li>Save favourites to get notified of new deals.</li>
              </ol>

              <h2 className="text-md font-semibold mt-6 mb-2">
                Tips
              </h2>

              <ul className="list-disc pl-4 space-y-2 text-sm">
                <li>Adjust your distance to discover more deals.</li>
                <li>Check regularly for limited-time specials.</li>
                <li>Favourite restaurants to stay updated.</li>
                <li>Open deals to see full details before visiting.</li>
              </ul>
            </>
          )}

          {isMerchant && (
            <>
              <h1 className="text-xl font-semibold mb-4">
                Promote your deals and attract more diners
              </h1>

              <h2 className="text-md font-semibold mt-4 mb-2">
                Getting Started
              </h2>

              <ol className="list-decimal pl-4 space-y-2 text-sm">
                <li>Create your account and verify your email.</li>
                <li>Complete your profile with your business details.</li>
                <li>Create your first deal with title, description and dates.</li>
                <li>Post your deal to make it visible to diners.</li>
                <li>Update deals regularly to keep customers engaged.</li>
              </ol>

              <h2 className="text-md font-semibold mt-6 mb-2">
                Tips
              </h2>

              <ul className="list-disc pl-4 space-y-2 text-sm">
                <li>Use clear photos of your food.</li>
                <li>Keep descriptions short and simple.</li>
                <li>Use limited-time offers to create urgency.</li>
                <li>Refresh deals often.</li>
              </ul>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default WireframeAnalysisPage;
