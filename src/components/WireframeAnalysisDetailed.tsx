import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users, Store, Shield } from 'lucide-react';

const WireframeAnalysisDetailed: React.FC = () => {
  const dashboardPages = [
    {
      name: "Customer Dashboard",
      icon: <Users className="h-5 w-5" />,
      functionality: [
        "Deal browsing with radius selector (3km, 5km, 10km)",
        "Location-based deal filtering",
        "Deal card display with merchant info",
        "Profile management access",
        "Logout functionality",
        "Refresh deals button"
      ],
      interactive: ["Radius selector", "Deal cards", "Profile button", "Logout", "Refresh"],
      forms: ["Radius selection dropdown"],
      dynamic: ["Deal loading states", "Location detection", "Deal carousel/grid"]
    },
    {
      name: "Merchant Dashboard",
      icon: <Store className="h-5 w-5" />,
      functionality: [
        "Deal management interface",
        "Profile setup and editing",
        "Deal creation and editing",
        "Navigation between deals and profile",
        "Image upload for deals",
        "Deal activation/deactivation"
      ],
      interactive: ["My Deals tab", "My Profile tab", "Add Deal", "Edit Deal", "Delete Deal"],
      forms: ["Deal creation form", "Profile edit form", "Image upload"],
      dynamic: ["Tab switching", "Modal dialogs", "Image preview", "Deal status toggles"]
    },
    {
      name: "Admin Dashboard",
      icon: <Shield className="h-5 w-5" />,
      functionality: [
        "User management (customers and merchants)",
        "System statistics display",
        "Email verification management",
        "User editing and deletion",
        "Admin authentication"
      ],
      interactive: ["User tables", "Edit buttons", "Delete buttons", "Stats refresh"],
      forms: ["Admin login", "User edit forms"],
      dynamic: ["Data tables", "Statistics charts", "Confirmation dialogs"]
    }
  ];

  const missingElements = [
    "Password reset functionality",
    "Email verification flow details",
    "Deal expiration handling",
    "Push notification settings",
    "Search functionality for deals",
    "Deal categories/filtering",
    "Merchant verification process",
    "Rating/review system",
    "Deal sharing functionality",
    "Offline mode handling"
  ];

  const ambiguousElements = [
    "Navigation flow between merchant profile and deals view",
    "Deal image requirements and validation",
    "Location permission handling",
    "Error state presentations",
    "Mobile responsiveness specifications",
    "Data refresh intervals",
    "User session management"
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Complete Wireframe Analysis</h1>
        <p className="text-gray-600">Detailed analysis including dashboard pages and identified gaps</p>
      </div>

      <div className="grid gap-6">
        {dashboardPages.map((page, index) => (
          <Card key={index} className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {page.icon}
                {page.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Expected Functionality</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {page.functionality.map((func, i) => (
                    <li key={i}>{func}</li>
                  ))}
                </ul>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h5 className="font-medium mb-2">Interactive Elements</h5>
                  <div className="flex flex-wrap gap-1">
                    {page.interactive.map((item, i) => (
                      <Badge key={i} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-2">Forms & Inputs</h5>
                  <div className="flex flex-wrap gap-1">
                    {page.forms.map((form, i) => (
                      <Badge key={i} variant="outline">{form}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-2">Dynamic Components</h5>
                  <div className="flex flex-wrap gap-1">
                    {page.dynamic.map((comp, i) => (
                      <Badge key={i} variant="default">{comp}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <h4 className="font-semibold mb-2">Missing Elements</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {missingElements.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <h4 className="font-semibold mb-2">Ambiguous Elements</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {ambiguousElements.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default WireframeAnalysisDetailed;