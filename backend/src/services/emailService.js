const nodemailer = require('nodemailer');
const { config } = require('../config/env');

let cachedTransporter = null;

const isConfigured = () =>
  Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  if (!isConfigured()) return null;

  cachedTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return cachedTransporter;
};

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback: log so developers can grab OTPs without configuring SMTP.
    console.log('━'.repeat(60));
    console.log('📧 [DEV EMAIL FALLBACK] No SMTP configured — logging instead');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${text || html}`);
    console.log('━'.repeat(60));
    return { devFallback: true };
  }

  const info = await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    html,
  });
  return { messageId: info.messageId };
};

const sendVerificationOtp = async ({ to, name, otp }) => {
  const subject = 'Verify your AUMO email — OTP inside';
  const text = `Hi ${name || 'there'},\n\nYour AUMO verification code is: ${otp}\n\nIt expires in 10 minutes. If you didn't request this, ignore the email.\n\n— AUMO`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
      <h2 style="color:#22c55e;margin:0 0 16px;">🌿 Verify your email</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Your AUMO verification code is:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#22c55e;background:rgba(34,197,94,0.1);padding:16px;border-radius:12px;text-align:center;margin:16px 0;">${otp}</div>
      <p style="color:#94a3b8;font-size:14px;">Expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

module.exports = {
  generateOtp,
  sendVerificationOtp,
  isConfigured,
};
