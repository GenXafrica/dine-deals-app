# Deployment Notes for process-pending-emails Edge Function
## Issue
The automatic deployment of the `process-pending-emails` Edge Function failed due to network connectivity issues with the Supabase deployment service.

## Solution
The updated function code has been saved to `supabase/functions/process-pending-emails/index.ts`

## Manual Deployment Steps

To deploy this function manually, run:

```bash
supabase functions deploy process-pending-emails
```

Or using the Supabase CLI with your project reference:

```bash
npx supabase functions deploy process-pending-emails --project-ref cexezutizzchdpsspghx
```

## Function Overview

The updated `process-pending-emails` function:

1. **Queries email_queue table** for rows where `status = 'pending'` and `attempts < 5`
2. **Uses SMTP configuration** from the row's smtp_* fields, or falls back to `get_admin_email_settings()`
3. **Sends emails** using nodemailer with STARTTLS on port 587
4. **Updates email_queue** after each attempt:
   - Increments `attempts`
   - Sets `last_attempt_at` to current timestamp
   - Sets `last_error` on failure
   - Sets `status = 'sent'` and `last_error = NULL` on success
   - Marks as `status = 'failed'` after max attempts (5)
5. **Marks customer welcome emails** by setting `customers.welcome_email_sent_at` on success

## Required Secrets

The function reads these Supabase project secrets:

- **PROCESS_PENDING_EMAILS_SECRET** - Authorization secret for invoking the function
- **SUPABASE_URL** - Automatically provided by Supabase
- **SUPABASE_SERVICE_ROLE_KEY** - Automatically provided by Supabase
- **SMTP_HOST** - Retrieved via get_admin_email_settings() or from email_queue row
- **SMTP_USER** - Retrieved via get_admin_email_settings() or from email_queue row
- **SMTP_PASSWORD** - Retrieved via get_admin_email_settings() or from email_queue row

All secrets are already configured in your Supabase project.

## Invocation

The function requires the `x-process-secret` header:

```bash
curl -X POST https://cexezutizzchdpsspghx.supabase.co/functions/v1/process-pending-emails \
  -H "x-process-secret: YOUR_SECRET_HERE" \
  -H "Content-Type: application/json"
```

## Console Logs

The function logs:
- ✓ Success: "Sent email {id} to {recipient} (messageId: {messageId})"
- ✗ Failure: "Failed email {id} to {recipient}: {error}"
- Summary: "Completed: {sent} sent, {failed} failed"
