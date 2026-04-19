import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Terminal, Code, Info } from 'lucide-react';

export default function SMTPManualTestGuide() {
  const nodejsTestCode = `const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'mail.dinedeals.co.za',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'noreply@dinedeals.co.za',
    pass: 'YOUR_PASSWORD_HERE'
  }
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.log('SMTP Error:', error);
  } else {
    console.log('SMTP Connection successful');
  }
});`;

  const powershellTestCode = `# PowerShell SMTP Test
$SMTPServer = "mail.dinedeals.co.za"
$SMTPPort = 465
$Username = "noreply@dinedeals.co.za"
$Password = "YOUR_PASSWORD_HERE"

# Create credentials
$SecurePassword = ConvertTo-SecureString $Password -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential($Username, $SecurePassword)

# Test email
Send-MailMessage -SmtpServer $SMTPServer -Port $SMTPPort -UseSsl -Credential $Credential -From $Username -To "test@example.com" -Subject "Test" -Body "Test message"`;

  const curlTestCode = `# Using curl to test SMTP (basic connectivity)
curl -v --ssl-reqd --url smtps://mail.dinedeals.co.za:465 --user noreply@dinedeals.co.za:YOUR_PASSWORD_HERE --mail-from noreply@dinedeals.co.za --mail-rcpt test@example.com --upload-file email.txt

# Create email.txt file:
echo "Subject: Test Email\n\nThis is a test message." > email.txt`;

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-gray-600" />
          <CardTitle className="text-gray-800 text-sm">Manual SMTP Testing Guide</CardTitle>
        </div>
        <CardDescription className="text-xs text-gray-600">
          Test SMTP credentials manually using CLI tools or Node.js
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs text-blue-700">
            <strong>Afrihost SMTP Settings:</strong> Use these exact settings for manual testing
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <Badge variant="outline" className="text-xs">Server Details</Badge>
            <div className="bg-gray-50 p-2 rounded font-mono">
              <div>Host: mail.dinedeals.co.za</div>
              <div>Port: 465</div>
              <div>Security: SSL/TLS</div>
              <div>Auth: Required</div>
            </div>
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="text-xs">Credentials</Badge>
            <div className="bg-gray-50 p-2 rounded font-mono">
              <div>Username: noreply@dinedeals.co.za</div>
              <div>Password: [From Afrihost Panel]</div>
              <div>From: noreply@dinedeals.co.za</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Code className="w-3 h-3 text-green-600" />
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Node.js Test</Badge>
            </div>
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
              <code>{nodejsTestCode}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Terminal className="w-3 h-3 text-blue-600" />
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">PowerShell Test</Badge>
            </div>
            <pre className="bg-blue-900 text-blue-200 p-3 rounded text-xs overflow-x-auto">
              <code>{powershellTestCode}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Terminal className="w-3 h-3 text-orange-600" />
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">cURL Test</Badge>
            </div>
            <pre className="bg-orange-900 text-orange-200 p-3 rounded text-xs overflow-x-auto">
              <code>{curlTestCode}</code>
            </pre>
          </div>
        </div>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-xs text-yellow-700">
            <strong>Troubleshooting Tips:</strong>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Ensure your password is correct from Afrihost control panel</li>
              <li>Check if port 465 is blocked by your firewall</li>
              <li>Verify SSL/TLS is enabled in your SMTP client</li>
              <li>Test from different networks to rule out ISP blocking</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}