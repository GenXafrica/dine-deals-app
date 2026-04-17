import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import nodemailer from 'npm:nodemailer@6.9.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-process-secret'
};

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 50;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify secret
    const secret = req.headers.get('x-process-secret');
    const expectedSecret = Deno.env.get('PROCESS_PENDING_EMAILS_SECRET');
    
    if (!secret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Query email_queue for pending emails
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) throw fetchError;
    
    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('No pending emails to process');
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0, 
        sent: 0, 
        failed: 0 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log(`Processing ${pendingEmails.length} pending emails`);
    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      try {
        // Get SMTP configuration from row or admin settings
        let smtpConfig;
        
        if (email.smtp_host) {
          smtpConfig = {
            smtp_host: email.smtp_host,
            smtp_port: email.smtp_port || 587,
            smtp_user: email.smtp_user,
            smtp_pass: email.smtp_pass,
            from_email: email.from_email,
            reply_to: email.reply_to
          };
        } else {
          const { data: adminSettings, error: settingsError } = await supabase
            .rpc('get_admin_email_settings');
          
          if (settingsError || !adminSettings || adminSettings.length === 0) {
            throw new Error('No SMTP configuration available');
          }
          
          smtpConfig = adminSettings[0];
        }

        if (!smtpConfig.smtp_host) {
          throw new Error('SMTP host not configured');
        }

        // Create nodemailer transport with STARTTLS on port 587
        const transport = nodemailer.createTransport({
          host: smtpConfig.smtp_host,
          port: smtpConfig.smtp_port || 587,
          secure: false, // Use STARTTLS, not implicit TLS
          auth: smtpConfig.smtp_user ? {
            user: smtpConfig.smtp_user,
            pass: smtpConfig.smtp_pass
          } : undefined,
          requireTLS: true,
          tls: { rejectUnauthorized: false }
        });

        const fromAddr = email.from_email || smtpConfig.from_email || smtpConfig.smtp_user;
        const replyTo = email.reply_to || smtpConfig.reply_to || fromAddr;
        const subject = email.subject || `Dine Deals — ${email.template_type || 'notification'}`;

        const mailOptions = {
          from: fromAddr,
          to: email.recipient,
          subject: subject,
          text: email.content || '',
          replyTo: replyTo
        };

        if (email.html) {
          mailOptions.html = email.html;
        }

        // Send email
        const info = await transport.sendMail(mailOptions);
        console.log(`✓ Sent email ${email.id} to ${email.recipient} (messageId: ${info.messageId})`);

        // Update email_queue: mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            attempts: (email.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString(),
            last_error: null
          })
          .eq('id', email.id);

        // Mark customer welcome email as sent
        if (email.template_type === 'customer_welcome' && email.recipient) {
          await supabase
            .from('customers')
            .update({ welcome_email_sent_at: new Date().toISOString() })
            .eq('email', email.recipient)
            .is('welcome_email_sent_at', null);
        }

        sent++;
      } catch (error) {
        const newAttempts = (email.attempts || 0) + 1;
        const newStatus = newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
        const errorMsg = error.message || String(error);
        
        console.error(`✗ Failed email ${email.id} to ${email.recipient}: ${errorMsg}`);

        // Update email_queue: mark as failed or retry
        await supabase
          .from('email_queue')
          .update({
            status: newStatus,
            attempts: newAttempts,
            last_attempt_at: new Date().toISOString(),
            last_error: errorMsg.substring(0, 2000)
          })
          .eq('id', email.id);

        failed++;
      }
    }

    console.log(`Completed: ${sent} sent, ${failed} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: pendingEmails.length, 
      sent, 
      failed 
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
