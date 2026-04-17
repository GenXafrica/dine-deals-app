import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface RadiusSelectorProps {
  selectedRadius: number;
  onRadiusChange: (radius: number) => void;
}

export const RadiusSelector: React.FC<RadiusSelectorProps> = ({
  selectedRadius,
  onRadiusChange
}) => {

  const radiusOptions = [3, 5, 10];

  const label = (radius: number) => {
    if (radius === 10) return "10 km+";
    return `${radius} km`;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
      <CardContent className="p-6">

        <div className="flex items-center justify-center space-x-2 mb-4">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Search Radius</h3>
        </div>

        <div className="flex justify-center space-x-3 mb-4">
          {radiusOptions.map((radius) => (
            <Button
              key={radius}
              onClick={() => onRadiusChange(radius)}
              variant={selectedRadius === radius ? "default" : "outline"}
              className={`px-6 py-2 font-semibold ${
                selectedRadius === radius
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  : 'border-blue-600 text-blue-600 hover:bg-blue-50 bg-white/90'
              }`}
            >
              {label(radius)}
            </Button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-700 font-medium">
          Showing deals within {selectedRadius === 10 ? "10+ km" : `${selectedRadius} km`} of your location
        </p>

      </CardContent>
    </Card>
  );
};