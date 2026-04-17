import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Save, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplateEditorProps {
  title: string;
  template: string;
  onSave: (template: string) => Promise<void>;
  onTest?: () => Promise<void>;
  placeholders: string[];
  defaultTemplate: string;
  saving?: boolean;
  compact?: boolean;
}

export default function EmailTemplateEditor({
  title,
  template,
  onSave,
  onTest,
  placeholders,
  defaultTemplate,
  saving = false,
  compact = false
}: EmailTemplateEditorProps) {
  const [currentTemplate, setCurrentTemplate] = useState(template || defaultTemplate);
  const [showPreview, setShowPreview] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!currentTemplate.trim()) {
      toast({
        title: 'Error',
        description: 'Template content cannot be empty',
        variant: 'destructive'
      });
      return;
    }
    try {
      await onSave(currentTemplate);
      toast({
        title: 'Success',
        description: 'Template saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    setSendingTest(true);
    try {
      await onTest();
    } catch (error: any) {
      console.error('Test email error:', error);
      toast({
        title: 'Email Send Failed',
        description: error?.message || 'Failed to send test email. Check console for details.',
        variant: 'destructive'
      });
    } finally {
      setSendingTest(false);
    }
  };

  const renderPreview = () => {
    let preview = currentTemplate;
    const exampleData: Record<string, string> = {
      customer_name: 'John Doe',
      merchant_name: 'Jane Smith',
      user_name: 'John Doe',
      email: 'user@example.com',
      signup_date: new Date().toLocaleDateString(),
      restaurant_name: 'Delicious Eats',
      verification_link: 'https://dinedeals.co.za/verify?token=example123'
    };

    placeholders.forEach(placeholder => {
      const value = exampleData[placeholder] || `[${placeholder}]`;
      preview = preview.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value);
    });

    return preview;
  };

  if (compact) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-800 text-xs">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Textarea
            value={currentTemplate}
            onChange={(e) => setCurrentTemplate(e.target.value)}
            placeholder={defaultTemplate}
            className="min-h-[60px] border-orange-200 focus:border-red-500 text-xs"
          />
          <div className="flex flex-wrap gap-1">
            {placeholders.slice(0, 3).map((placeholder) => (
              <code key={placeholder} className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                {`{{${placeholder}}}`}
              </code>
            ))}
            {placeholders.length > 3 && (
              <span className="text-xs text-gray-500">+{placeholders.length - 3} more</span>
            )}
          </div>
          {showPreview && (
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <div className="whitespace-pre-wrap text-xs">{renderPreview()}</div>
            </div>
          )}
          <div className="flex space-x-1">
            <Button
              onClick={handleSave}
              disabled={saving || !currentTemplate.trim()}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              size="sm"
              className="border-orange-200 hover:bg-orange-50"
            >
              <Eye className="w-3 h-3" />
            </Button>
            {onTest && (
              <Button
                onClick={handleTest}
                disabled={sendingTest}
                variant="outline"
                size="sm"
                className="border-blue-200 hover:bg-blue-50 text-blue-600"
              >
                {sendingTest ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-orange-200">
      <CardHeader>
        <CardTitle className="text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={currentTemplate}
          onChange={(e) => setCurrentTemplate(e.target.value)}
          placeholder={defaultTemplate}
          className="min-h-[120px] border-orange-200 focus:border-red-500"
        />
        <div className="flex flex-wrap gap-2">
          {placeholders.map((placeholder) => (
            <code key={placeholder} className="bg-gray-100 px-2 py-1 rounded text-xs">
              {`{{${placeholder}}}`}
            </code>
          ))}
        </div>
        {showPreview && (
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <div className="whitespace-pre-wrap text-sm">{renderPreview()}</div>
          </div>
        )}
        <div className="flex space-x-2">
          <Button
            onClick={handleSave}
            disabled={saving || !currentTemplate.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            className="border-orange-200 hover:bg-orange-50"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          {onTest && (
            <Button
              onClick={handleTest}
              disabled={sendingTest}
              variant="outline"
              className="border-blue-200 hover:bg-blue-50 text-blue-600"
            >
              {sendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
