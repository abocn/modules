import Mailgun from "mailgun.js";
import formData from "form-data";

let mg: ReturnType<Mailgun['client']> | null = null;

/**
 * Get or create Mailgun client instance
 * @throws {Error} If Mailgun API key is not configured
 */
function getMailgunClient() {
  if (!process.env.MAILGUN_API_KEY) {
    throw new Error("MAILGUN_API_KEY environment variable is not set");
  }

  if (!mg) {
    const mailgun = new Mailgun(formData);
    mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_API_URL || "https://api.mailgun.net"
    });
  }
  return mg;
}

/**
 * Check if email service is properly configured
 */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.MAILGUN_API_KEY &&
    process.env.MAILGUN_DOMAIN
  );
}

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "";
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || "noreply@modules.lol";
const FROM_NAME = process.env.MAILGUN_FROM_NAME || "Modules";

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

/**
 * Send an email using Mailgun
 * @param options Email options
 * @returns Promise with message ID
 */
export async function sendEmail(options: SendEmailOptions) {
  if (!isEmailConfigured()) {
    const message = "Email service not configured. Missing MAILGUN_API_KEY or MAILGUN_DOMAIN";
    console.error(message);
    throw new Error(message);
  }

  try {
    const client = getMailgunClient();
    const messageData = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      ...(options.text && { text: options.text }),
      ...(options.html && { html: options.html }),
      ...(options.replyTo && { "h:Reply-To": options.replyTo }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await client.messages.create(MAILGUN_DOMAIN, messageData as any);
    return result;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

/**
 * Send password reset email
 * @param email User email address
 * @param resetUrl Password reset URL
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background: #000; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; border: 1px solid #27272a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #09090b; padding: 30px; border: 1px solid #27272a; border-top: 0; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #fff; color: #000; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; }
          .button:hover { background: #f4f4f5; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #27272a; font-size: 14px; color: #a1a1aa; }
          a { color: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your Modules account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #a1a1aa;">${resetUrl}</p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <div class="footer">
              <p>Best regards,<br>The Modules Team</p>
              <p style="font-size: 12px; color: #999;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Password Reset Request

Hello,

We received a request to reset your password for your Modules account.

To reset your password, visit the following link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
The Modules Team
  `.trim();

  await sendEmail({
    to: email,
    subject: "Reset Your Password - Modules",
    text,
    html,
  });
}

/**
 * Send email verification email
 * @param email User email address
 * @param verificationUrl Email verification URL
 */
export async function sendVerificationEmail(email: string, verificationUrl: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background: #000; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; border: 1px solid #27272a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #09090b; padding: 30px; border: 1px solid #27272a; border-top: 0; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #fff; color: #000; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; }
          .button:hover { background: #f4f4f5; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #27272a; font-size: 14px; color: #a1a1aa; }
          a { color: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Modules!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #a1a1aa;">${verificationUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <div class="footer">
              <p>Best regards,<br>The Modules Team</p>
              <p style="font-size: 12px; color: #999;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to modules!

Hello,

Thank you for signing up! Please verify your email address to complete your registration.

To verify your email, visit the following link:
${verificationUrl}

This link will expire in 1 hour.

Best regards,
The Modules Team
  `.trim();

  await sendEmail({
    to: email,
    subject: "Verify Your Email - Modules",
    text,
    html,
  });
}

/**
 * Send a test email to verify email configuration
 * @param recipientEmail Email address to send test to
 * @returns Promise with message ID or error
 */
export async function sendTestEmail(recipientEmail: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background: #000; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; border: 1px solid #27272a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #09090b; padding: 30px; border: 1px solid #27272a; border-top: 0; border-radius: 0 0 8px 8px; }
          .info-box { background: #18181b; border: 1px solid #27272a; border-radius: 5px; padding: 15px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #27272a; font-size: 14px; color: #a1a1aa; }
          code { background: #27272a; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Email - Modules</h1>
          </div>
          <div class="content">
            <p>Hello Admin,</p>
            <p>This is a test email from Modules to verify that email sending is configured correctly.</p>

            <div class="info-box">
              <h3 style="margin-top: 0;">Configuration Details:</h3>
              <p><strong>From:</strong> ${FROM_NAME} &lt;${FROM_EMAIL}&gt;</p>
              <p><strong>Domain:</strong> ${MAILGUN_DOMAIN || 'Not configured'}</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
              <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'production'}</p>
            </div>

            <p>If you received this email, your email configuration is working correctly!</p>

            <div class="footer">
              <p>This is an automated test message sent by an administrator.</p>
              <p style="font-size: 12px; color: #999;">Modules - Admin Tools</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Test Email - Modules

Hello Admin,

This is a test email from your Modules to verify that email sending is configured correctly.

Configuration Details:
- From: ${FROM_NAME} <${FROM_EMAIL}>
- Domain: ${MAILGUN_DOMAIN || 'Not configured'}
- Time: ${new Date().toISOString()}
- Environment: ${process.env.NODE_ENV || 'production'}

If you received this email, your email configuration is working correctly!

This is an automated test message sent by an administrator.
Modules - Admin Tools
  `.trim();

  return await sendEmail({
    to: recipientEmail,
    subject: "Test Email - Modules",
    text,
    html,
  });
}