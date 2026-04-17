import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';

const AdminEmailSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Emails</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Welcome</CardTitle>
            <CardDescription>Email sent to new customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input value="Welcome to Dine Deals!" readOnly />
            </div>
            <div>
              <Label>HTML Content</Label>
              <Textarea value="<h1>Welcome {{name}}!</h1><p>Thank you for joining Dine Deals. Start discovering amazing deals near you!</p>" readOnly rows={4} />
            </div>
            <div>
              <Label>Text Content</Label>
              <Textarea value="Welcome {{name}}! Thank you for joining Dine Deals. Start discovering amazing deals near you!" readOnly rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Merchant Welcome</CardTitle>
            <CardDescription>Email sent to new merchants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input value="Welcome to Dine Deals - Your Business Account is Ready!" readOnly />
            </div>
            <div>
              <Label>HTML Content</Label>
              <Textarea value="<h1>Welcome {{business_name}}!</h1><p>Your merchant account is ready. You can now start creating deals for your customers.</p>" readOnly rows={4} />
            </div>
            <div>
              <Label>Text Content</Label>
              <Textarea value="Welcome {{business_name}}! Your merchant account is ready. You can now start creating deals for your customers." readOnly rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>Email verification template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input value="Verify Your Email - Dine Deals" readOnly />
            </div>
            <div>
              <Label>HTML Content</Label>
              <Textarea value="<h1>Verify Your Email</h1><p>Please click <a href='{{verification_link}}'>here</a> to verify your email address and complete your registration.</p>" readOnly rows={4} />
            </div>
            <div>
              <Label>Text Content</Label>
              <Textarea value="Verify your email by visiting: {{verification_link}}" readOnly rows={3} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEmailSettings;