import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import WireframeAnalysis from './WireframeAnalysis';
import WireframeAnalysisDetailed from './WireframeAnalysisDetailed';

const WireframeAnalysisReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary');

  const pagesSummary = [
    { name: "Home/Landing Page", status: "complete", components: 7 },
    { name: "About Us Page", status: "complete", components: 3 },
    { name: "Login/Register Page", status: "complete", components: 8 },
    { name: "Customer Dashboard", status: "complete", components: 12 },
    { name: "Merchant Dashboard", status: "complete", components: 15 },
    { name: "Admin Dashboard", status: "complete", components: 10 },
    { name: "Profile Management", status: "complete", components: 8 },
    { name: "Deal Management", status: "complete", components: 9 }
  ];

  const exportReport = () => {
    const reportData = {
      title: "Dine Deals Wireframe Analysis Report",
      date: new Date().toISOString().split('T')[0],
      pages: pagesSummary,
      totalPages: pagesSummary.length,
      totalComponents: pagesSummary.reduce((sum, page) => sum + page.components, 0)
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dine-deals-wireframe-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dine Deals Wireframe Analysis</h1>
          <p className="text-gray-600">Comprehensive analysis of web application structure</p>
        </div>
        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="basic">Basic Pages</TabsTrigger>
          <TabsTrigger value="detailed">Dashboard Pages</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pagesSummary.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pagesSummary.reduce((sum, page) => sum + page.components, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Complete</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">User Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-gray-500">Customer, Merchant, Admin</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pages Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pagesSummary.map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{page.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{page.components} components</Badge>
                      <Badge variant="secondary">{page.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="basic">
          <WireframeAnalysis />
        </TabsContent>

        <TabsContent value="detailed">
          <WireframeAnalysisDetailed />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <h4 className="font-semibold mb-2">Priority Recommendations</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Implement password reset functionality for better user experience</li>
                <li>Add comprehensive error handling and user feedback</li>
                <li>Clarify navigation flow between merchant dashboard sections</li>
                <li>Define mobile responsiveness specifications</li>
                <li>Add search and filtering capabilities for deals</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <h4 className="font-semibold mb-2">Well-Implemented Features</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Clear user role separation (Customer, Merchant, Admin)</li>
                <li>Comprehensive authentication system</li>
                <li>Location-based deal filtering</li>
                <li>Progressive Web App capabilities</li>
                <li>Responsive design with Tailwind CSS</li>
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WireframeAnalysisReport;