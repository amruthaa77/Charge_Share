import nodemailer from 'nodemailer';

let transporterPromise = null;

const getTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    // In test environment, return instant fast mock transport
    if (process.env.NODE_ENV === 'test') {
      return {
        sendMail: async (options) => ({ messageId: `test-${Date.now()}`, options }),
      };
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // Fallback to Nodemailer Ethereal test account for development
    try {
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch {
      return {
        sendMail: async (options) => ({ messageId: `mock-${Date.now()}`, options }),
      };
    }
  })();

  return transporterPromise;
};

const emailHeader = `
  <div style="background-color: #047857; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
      ChargeShare India
    </h1>
    <p style="color: #A7F3D0; margin: 4px 0 0 0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Bengaluru EV Community Charging Network
    </p>
  </div>
`;

const emailFooter = `
  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <p style="margin: 0 0 8px 0;">ChargeShare India &bull; Indiranagar 100ft Road, Bengaluru, Karnataka 560038</p>
    <p style="margin: 0 0 8px 0;">Support: <a href="mailto:support@chargeshare.in" style="color: #047857; text-decoration: none;">support@chargeshare.in</a> | Phone: +91 80 2555 0199</p>
    <p style="margin: 0; font-style: italic; color: #94A3B8;">Demo project. Payments run in test mode. Policy text is a template, not legal advice.</p>
  </div>
`;

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"ChargeShare India" <notifications@chargeshare.in>',
      to,
      subject,
      text: text || subject,
      html: `
        <div style="background-color: #F8FAFC; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
            ${emailHeader}
            <div style="padding: 24px 28px; color: #1E293B; line-height: 1.6; font-size: 14px;">
              ${html}
              ${emailFooter}
            </div>
          </div>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl?.(info);
    if (previewUrl && process.env.NODE_ENV !== 'test') {
      console.log(`✉️ [Ethereal Email Preview] ${subject} -> ${to}: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Email sending failed (non-blocking):', err.message);
    }
    return { success: false, error: err.message };
  }
};

export const sendWelcomeAndVerificationEmail = async (user, token) => {
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?verifyToken=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Welcome to ChargeShare India - Verify your account',
    html: `
      <h2 style="color: #0F172A; margin-top: 0;">Welcome, ${user.name}!</h2>
      <p>Thank you for joining Bengaluru's premier peer-to-peer EV charging community. With ChargeShare, you can easily access neighborhood EV bike and car chargers or host your own socket to earn income.</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${verifyUrl}" style="background-color: #047857; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="font-size: 13px; color: #64748B;">If the button does not work, copy and paste this verification URL into your browser:<br/>
        <span style="word-break: break-all; color: #047857;">${verifyUrl}</span>
      </p>
    `,
  });
};

export const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'ChargeShare India - Password Reset Request',
    html: `
      <h2 style="color: #0F172A; margin-top: 0;">Reset Your Password</h2>
      <p>Hello ${user.name},</p>
      <p>We received a request to reset the password for your ChargeShare India account. Click the button below to choose a new password. This link is valid for <strong>30 minutes</strong>.</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #047857; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 13px; color: #64748B;">If you did not request a password reset, you can safely ignore this email. Your current password remains unchanged.</p>
    `,
  });
};

export const sendBookingReceiptEmail = async (user, booking, charger) => {
  return sendEmail({
    to: user.email,
    subject: `Booking Confirmed: #${booking.bookingCode} - ChargeShare India`,
    html: `
      <h2 style="color: #0F172A; margin-top: 0;">Booking Confirmed!</h2>
      <p>Hello ${user.name}, your charging session has been reserved and secured.</p>
      <div style="background: #F1F5F9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Booking Reference:</strong> #${booking.bookingCode}</p>
        <p style="margin: 0 0 8px 0;"><strong>Charger:</strong> ${charger.title}</p>
        <p style="margin: 0 0 8px 0;"><strong>Location:</strong> ${charger.address}, Bengaluru - ${charger.postalCode}</p>
        <p style="margin: 0 0 8px 0;"><strong>Start Time:</strong> ${new Date(booking.slotStart).toLocaleString('en-IN')}</p>
        <p style="margin: 0 0 8px 0;"><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
        <p style="margin: 0;"><strong>Amount Paid:</strong> ₹${booking.totalAmount} (Includes ₹${booking.platformFee} 5% platform fee)</p>
      </div>
      <p style="font-size: 13px; color: #64748B;">Upon arrival at the location, present your QR code or booking code to the host to initiate power delivery.</p>
    `,
  });
};

export const sendBookingCancellationEmail = async (user, booking, refundAmount) => {
  return sendEmail({
    to: user.email,
    subject: `Booking Cancelled: #${booking.bookingCode} - ChargeShare India`,
    html: `
      <h2 style="color: #0F172A; margin-top: 0;">Booking Cancellation</h2>
      <p>Hello ${user.name}, your booking #${booking.bookingCode} has been cancelled.</p>
      <div style="background: #F1F5F9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Refund Eligible:</strong> ₹${refundAmount}</p>
        <p style="margin: 0;"><strong>Policy Applied:</strong> ${refundAmount === booking.totalAmount ? '100% Full Refund (>2 hours prior)' : refundAmount > 0 ? '50% Partial Refund (<=2 hours prior)' : '0% Non-refundable (after session start)'}</p>
      </div>
      <p style="font-size: 13px; color: #64748B;">If you are eligible for a refund, it will be automatically credited back to your original payment method in 3-5 banking days.</p>
    `,
  });
};

export const sendHostVerificationEmail = async (user, status, reason = '') => {
  const isApproved = status === 'VERIFIED';
  return sendEmail({
    to: user.email,
    subject: `Host KYC Verification Update: ${isApproved ? 'Approved' : 'Action Required'}`,
    html: `
      <h2 style="color: #0F172A; margin-top: 0;">Host Verification ${isApproved ? 'Approved!' : 'Review Update'}</h2>
      <p>Hello ${user.name},</p>
      <p>${isApproved 
        ? 'Congratulations! Your electricity safety inspection and property ownership documentation have been verified. Your charger listing is now published and active on the Bengaluru map.'
        : `Your verification submission requires updates. Reason from reviewer: "${reason || 'Documentation incomplete'}". Please log in to your host dashboard to update your safety checklist or photo submissions.`
      }</p>
    `,
  });
};

export const sendAccountDeletionEmail = async (email, name) => {
  return sendEmail({
    to: email,
    subject: 'ChargeShare India - Account Data Deletion Confirmation',
    html: `
      <h2 style="color: #0F172A; margin-top: 0;">Account Deleted</h2>
      <p>Hello ${name},</p>
      <p>Pursuant to your request and the Digital Personal Data Protection Act 2023 (DPDP Act), your ChargeShare India account and associated personally identifiable data have been anonymized and permanently deactivated.</p>
      <p style="font-size: 13px; color: #64748B;">Any upcoming reservations have been cancelled with applicable refunds. All active tokens have been invalidated.</p>
    `,
  });
};

export const sendAdminNewDeviceLoginEmail = async (adminUser, { ip, userAgent, timestamp }) => {
  return sendEmail({
    to: adminUser.email,
    subject: 'Security Alert: New Sign-In to ChargeShare India Admin Back-Office',
    html: `
      <h2 style="color: #0F172A; margin-top: 0;">New Administrator Sign-In Detected</h2>
      <p>Hello ${adminUser.name},</p>
      <p>A new administrative session was initialized on your ChargeShare India back-office account with the following details:</p>
      <div style="background: #F1F5F9; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 13px;">
        <p style="margin: 0 0 6px 0;"><strong>Time:</strong> ${timestamp || new Date().toISOString()}</p>
        <p style="margin: 0 0 6px 0;"><strong>IP Address:</strong> ${ip || 'Unknown'}</p>
        <p style="margin: 0;"><strong>Client / User-Agent:</strong> ${userAgent || 'Unknown'}</p>
      </div>
      <p style="font-size: 13px; color: #64748B;">If you initiated this sign-in, no further action is required. If you did not authorize this, please immediately reset your password and invalidate all active sessions via the CLI.</p>
    `,
  });
};
