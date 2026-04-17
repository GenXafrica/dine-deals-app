import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

const WireframeAnalysis: React.FC = () => {
  const pages = [
    {
      name: "Home/Landing Page",
      functionality: [
        "About Us button - navigates to about page",
        "Customer Login/Register button - opens customer auth flow",
        "Merchant Login/Register button - opens merchant auth flow",
        "Share button - native share or copy link",
        "Background image with overlay",
        "Logo display",
        "Location-based tagline"
      ],
      interactive: ["About Us", "Customer Login/Register", "Merchant Login/Register", "Share"],
      forms: [],
      dynamic: ["PWA install prompt", "Loading states", "Background image"]
    },
    {
      name: "About Us Page",
      functionality: [
        "Back button - returns to home",
        "Company information display",
        "Static content presentation"
      ],
      interactive: ["Back button"],
      forms: [],
      dynamic: ["Navigation state management"]
    },
    {
      name: "Login Page",
      functionality: [
        "Back button - returns to home",
        "Toggle between Login/Register forms",
        "Email/password authentication",
        "Form validation",
        "Success/error handling"
      ],
      interactive: ["Back button", "Login/Register toggle", "Submit button"],
      forms: ["Email input", "Password input", "Confirm password (register)"],
      dynamic: ["Form switching", "Validation messages", "Loading states"]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Dine Deals Wireframe Analysis</h1>
        <p className="text-gray-600">Comprehensive analysis of pages and functionality</p>
      </div>

      <div className="grid gap-6">
        {pages.map((page, index) => (
          <Card key={index} className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                {page.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Expected Functionality
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {page.functionality.map((func, i) => (
                    <li key={i}>{func}</li>
                  ))}
                </ul>
              </div>

              <Separator />

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
                    {page.forms.length > 0 ? (
                      page.forms.map((form, i) => (
                        <Badge key={i} variant="outline">{form}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
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
    </div>
  );
};

export default WireframeAnalysis;