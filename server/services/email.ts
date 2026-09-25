import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await transporter.sendMail({
    from: `"Smart Scheduler" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your Smart Scheduler password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Reset Your Password</h2>
        <p>You requested a password reset for your Smart Scheduler account.</p>
        <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
          style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px;">Or copy and paste this URL: <a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `,
  });
}
