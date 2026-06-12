const axios = require('axios');
const nodemailer = require('nodemailer');
const { config } = require('../config/env');

/**
 * Email delivery channels, in preference order:
 *   1. Brevo HTTP API (BREVO_API_KEY)   — most reliable on PaaS hosts
 *      because no outbound SMTP port is required.
 *   2. SMTP (SMTP_HOST + SMTP_USER + SMTP_PASS) — works for any provider.
 *   3. Dev console fallback — when nothing is configured, log the OTP to
 *      stdout so local development still works without keys.
 *
 * sendVerificationOtp throws on real failure (after the dev-fallback has
 * been ruled out), so callers can surface the reason to the user.
 */

let cachedTransporter = null;

const isBrevoApiConfigured = () => Boolean(config.brevoApiKey);
const isSmtpConfigured = () =>
  Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

const isConfigured = () => isBrevoApiConfigured() || isSmtpConfigured();

const getSmtpTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  if (!isSmtpConfigured()) return null;

  cachedTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return cachedTransporter;
};

const generateOtp = () => {
  const len = config.otpLength || 6;
  const min = 10 ** (len - 1);
  const max = 10 ** len - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

// Parse an RFC-822 "Name <addr>" or plain address into Brevo's sender shape.
const parseSender = (raw) => {
  if (!raw) return { email: 'no-reply@aumo.app', name: 'AUMO' };
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || 'AUMO', email: m[2] };
  return { email: raw.trim(), name: 'AUMO' };
};

// The sender used for every outgoing email. Prefers the explicitly-verified
// Brevo sender (BREVO_SENDER_EMAIL, e.g. admin.aumo@gmail.com); falls back to
// parsing EMAIL_FROM. The email MUST be a verified sender in Brevo or the API
// returns 400 "sender not valid".
const resolveSender = () => {
  if (config.brevoSenderEmail) {
    return { email: config.brevoSenderEmail, name: config.brevoSenderName || 'AumoN Team' };
  }
  return parseSender(config.smtp.from);
};

// Header form "Name <email>" for SMTP / nodemailer.
const fromHeader = () => {
  const s = resolveSender();
  return `${s.name} <${s.email}>`;
};

const sendViaBrevoApi = async ({ to, subject, html, text }) => {
  const sender = resolveSender();
  const { data } = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    },
    {
      headers: {
        'api-key': config.brevoApiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      timeout: 10000,
    }
  );
  return { messageId: data.messageId, channel: 'brevo-api' };
};

const sendViaSmtp = async ({ to, subject, html, text }) => {
  const transporter = getSmtpTransporter();
  const info = await transporter.sendMail({
    from: fromHeader(),
    to,
    subject,
    text,
    html,
  });
  return { messageId: info.messageId, channel: 'smtp' };
};

const logDevFallback = ({ to, subject, text, html }) => {
  console.log('━'.repeat(60));
  console.log('📧 [DEV EMAIL FALLBACK] No mail provider configured — logging instead');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:    ${text || html}`);
  console.log('━'.repeat(60));
  return { devFallback: true, channel: 'console' };
};

const sendMail = async (params) => {
  if (isBrevoApiConfigured()) {
    try {
      return await sendViaBrevoApi(params);
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      console.error('Brevo API send failed:', detail);
      // Try SMTP as a fallback before giving up.
      if (isSmtpConfigured()) {
        try {
          return await sendViaSmtp(params);
        } catch (smtpErr) {
          console.error('SMTP fallback also failed:', smtpErr.message);
          throw new Error(`Email delivery failed: ${detail}`);
        }
      }
      throw new Error(`Brevo API: ${detail}`);
    }
  }

  if (isSmtpConfigured()) {
    try {
      return await sendViaSmtp(params);
    } catch (err) {
      console.error('SMTP send failed:', err.message);
      throw new Error(`SMTP: ${err.message}`);
    }
  }

  return logDevFallback(params);
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

// Optional "welcome / verified" email sent after a user verifies. Best-effort:
// callers should not await-throw on it.
const sendWelcomeEmail = async ({ to, name }) => {
  const appUrl = config.frontendUrl;
  const subject = '✅ Email verified — welcome to AumoN!';
  const text = `Hi ${name || 'there'},\n\nYour email is verified! You now have full access to AumoN — find and schedule carpool rides, track your CO₂ savings, and more.\n\n${appUrl}/carpool\n\n— AumoN Team`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
      <h2 style="color:#22c55e;margin:0 0 16px;">🎉 Welcome to AumoN!</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Your email is verified — you now have full access:</p>
      <ul style="color:#cbd5e1;">
        <li>🚗 Find &amp; schedule carpool rides</li>
        <li>🌱 Track your CO₂ savings</li>
        <li>📊 Your dashboard &amp; stats</li>
      </ul>
      <a href="${appUrl}/carpool" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#22c55e;color:#04210f;text-decoration:none;border-radius:10px;font-weight:700;">Browse rides</a>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

// Which delivery channel is active — surfaced at boot so misconfiguration on
// Render is obvious in the logs.
const getStatus = () => {
  let channel = 'console (dev fallback — NO real emails)';
  if (isBrevoApiConfigured()) channel = 'Brevo HTTP API';
  else if (isSmtpConfigured()) channel = 'SMTP';
  const s = resolveSender();
  return { channel, sender: `${s.name} <${s.email}>`, configured: isConfigured() };
};

// One-line boot diagnostic.
(() => {
  const st = getStatus();
  console.log(`📧 Email channel: ${st.channel} | from: ${st.sender}`);
  if (!st.configured) {
    console.warn('⚠️  No email provider configured — set BREVO_API_KEY (+ BREVO_SENDER_EMAIL) to send real OTPs.');
  }
})();

module.exports = {
  generateOtp,
  sendVerificationOtp,
  sendWelcomeEmail,
  sendMail,
  isConfigured,
  getStatus,
};
