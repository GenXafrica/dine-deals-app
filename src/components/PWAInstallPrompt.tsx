import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Smartphone, X } from 'lucide-react';
import { Button } from './ui/button';

interface PWAInstallPromptProps {
  onInstall: () => void; // kept for compatibility
  onDismiss: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onDismiss }) => {
  return (
    <div
      className="fixed left-4 right-4 z-40 md:left-auto md:right-4 md:w-80"
      style={{
        bottom: 'calc(11rem + env(safe-area-inset-bottom))',
      }}
    >
      <Card className="shadow-lg border-2 border-red-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-red-500" />
              <CardTitle className="text-sm">Install Dine Deals</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CardDescription className="text-xs">
            Tap install on the button below, or from the Chrome menu, to add Dine Deals to your home screen.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/683946324043f54d19950def_1748934009020_d5a75970.png"
              alt="Dine Deals"
              className="w-10 h-10 rounded-lg"
            />
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-2">Benefits:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Quick home screen access</li>
                <li>• Works offline</li>
                <li>• Faster loading</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
