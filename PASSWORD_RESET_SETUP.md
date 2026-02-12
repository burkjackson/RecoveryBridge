# Password Reset Setup Guide

## Overview
RecoveryBridge now includes a complete password recovery flow that allows users to reset their passwords via email.

## User Flow

1. **Forgot Password Page** (`/forgot-password`)
   - User enters their email address
   - System sends password reset email via Supabase

2. **Password Reset Email**
   - User receives email with reset link
   - Link expires after 1 hour
   - Clicking link redirects to `/reset-password`

3. **Reset Password Page** (`/reset-password`)
   - User enters new password (minimum 6 characters)
   - User confirms new password
   - System validates and updates password

4. **Login Page** (`/login`)
   - User redirected with success message
   - User can log in with new password

## Supabase Configuration

### Email Templates
The password reset email is configured in your Supabase project:

1. Go to **Authentication > Email Templates** in your Supabase dashboard
2. Select **"Reset Password"** template
3. Ensure the template includes a link to: `{{ .SiteURL }}/reset-password`

### Redirect URLs
Configure allowed redirect URLs in Supabase:

1. Go to **Authentication > URL Configuration** in your Supabase dashboard
2. Add these URLs to **Redirect URLs**:
   - Development: `http://localhost:3000/reset-password`
   - Production: `https://yourdomain.com/reset-password`
   - Vercel: `https://recoverybridge.vercel.app/reset-password`

### Site URL
Set your Site URL:

1. Go to **Authentication > URL Configuration**
2. Set **Site URL** to your production domain:
   - Production: `https://yourdomain.com`
   - Vercel: `https://recoverybridge.vercel.app`

## Testing the Flow

### Local Testing
1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000/login
3. Click "Forgot password?"
4. Enter test email address
5. Check email inbox for reset link
6. Click link and set new password
7. Verify redirect to login with success message
8. Log in with new password

### Production Testing
1. Deploy to Vercel
2. Navigate to your production URL
3. Follow same steps as local testing
4. Verify all redirects work correctly

## Security Features

- **Link Expiration**: Reset links expire after 1 hour
- **Single Use**: Each reset link can only be used once
- **Session Validation**: System checks for valid recovery session
- **Password Requirements**: Minimum 6 characters (can be increased)
- **Password Confirmation**: Users must confirm new password
- **Secure Updates**: Passwords updated via Supabase Auth API

## Troubleshooting

### "Invalid or Expired Link" Error
- Link has expired (>1 hour old)
- Link has already been used
- User needs to request a new reset link

### Reset Email Not Received
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email sending limits
- Verify email templates are configured

### Redirect Not Working
- Verify redirect URLs are added to Supabase
- Check Site URL is configured correctly
- Ensure URLs match exactly (http vs https)

## Email Customization

Customize the password reset email in Supabase:

1. Go to **Authentication > Email Templates**
2. Select **"Reset Password"**
3. Customize subject, body, and styling
4. Preview and save changes

## Rate Limiting

Supabase includes built-in rate limiting for password reset requests to prevent abuse. Default limits:
- 4 requests per hour per email address
- 10 requests per hour per IP address

## Files Modified/Created

- `/app/forgot-password/page.tsx` - New: Email submission page
- `/app/reset-password/page.tsx` - New: Password reset page
- `/app/login/page.tsx` - Modified: Added success message display
- `/PASSWORD_RESET_SETUP.md` - New: This documentation

## Next Steps

1. Configure Supabase email templates (see above)
2. Add redirect URLs to Supabase (see above)
3. Test the flow in development
4. Deploy to production
5. Test the flow in production
6. (Optional) Customize email template styling
7. (Optional) Adjust password requirements if needed
