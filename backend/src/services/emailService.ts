import nodemailer from 'nodemailer';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;
let useEthereal = false;

const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  if (config.email.user && config.email.pass) {
    // Use real SMTP credentials
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
    logger.info('📧 Email transport: Real SMTP configured');
  } else {
    // Fallback to Ethereal (free fake inbox for testing)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    useEthereal = true;
    logger.info(`📧 Email transport: Ethereal test inbox (${testAccount.user})`);
    logger.info(`📧 View all captured emails at: https://ethereal.email/login`);
    logger.info(`📧   Username: ${testAccount.user}`);
    logger.info(`📧   Password: ${testAccount.pass}`);
  }

  return transporter;
};

interface EmailAttachment {
  filename: string;
  content: any;
  contentType?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: config.email.from || 'EventSphere <noreply@eventsphere.com>',
      ...options,
    });
    logger.info(`📧 Email sent to ${options.to}: ${options.subject}`);

    // If using Ethereal, log the preview URL
    if (useEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 ➜ Preview: ${previewUrl}`);
      }
    }
  } catch (error) {
    logger.error('Failed to send email', error);
  }
};

// Common CSS styling block to maintain premium aesthetics across all templates
const commonStyles = `
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2d3748; margin: 0; padding: 0; background-color: #f7fafc; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 600px; margin: 20px auto; padding: 0 16px; }
    .card { background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 24px; }
    .content p { font-size: 15px; line-height: 1.6; color: #4a5568; margin: 0 0 16px 0; }
    .detail-box { background-color: #f8fafc; border: 1px solid #edf2f7; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #718096; font-weight: 500; }
    .detail-value { color: #1a202c; font-weight: 700; text-align: right; }
    .btn-container { text-align: center; margin: 24px 0 12px 0; }
    .button { display: inline-block; background-color: #6366f1; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none; text-align: center; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2); }
    .ref-badge { background-color: #f0f2ff; border: 1px dashed #6366f1; color: #6366f1; font-family: monospace; font-size: 16px; font-weight: bold; padding: 12px 20px; border-radius: 8px; text-align: center; margin: 16px 0; display: block; letter-spacing: 1px; }
    .footer { text-align: center; padding: 24px; font-size: 12px; color: #a0aec0; }
    .highlight-red { color: #ef4444; }
  </style>
`;

// 1. Booking Confirmation Email
export const sendBookingConfirmationEmail = async (
  to: string,
  name: string,
  eventTitle: string,
  bookingRef: string,
  eventDate: string,
  venue: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${commonStyles}
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
            <p>Your tickets are reserved for ${eventTitle}</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Great news! Your booking has been successfully confirmed. Please find your reservation details below:</p>
            
            <div class="ref-badge">
              <span style="display:block; font-size:10px; color:#718096; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px; margin-bottom:4px;">Booking Reference</span>
              <span>${bookingRef}</span>
            </div>
            
            <div class="detail-box">
              <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
              <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${eventDate}</span></div>
              <div class="detail-row"><span class="detail-label">Venue</span><span class="detail-value">${venue}</span></div>
            </div>
            
            <div class="btn-container">
              <a href="${config.frontendUrl}/dashboard/bookings" class="button">View Booking Dashboard</a>
            </div>
            
            <p style="font-size:13px; color:#a0aec0; margin-top:20px; text-align:center;">Please present this email or download your passes from the dashboard for check-in at the gates.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject: `Booking Confirmed: ${eventTitle}`, html });
};

// 2. Ticket Delivery Email
export const sendTicketEmail = async (
  to: string,
  name: string,
  eventTitle: string,
  bookingRef: string,
  eventDate: string,
  venue: string,
  pdfBuffer: Buffer
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${commonStyles}
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <h1>🎟️ Your Passes are Attached!</h1>
            <p>Digital tickets for ${eventTitle} are ready</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for your purchase! We have successfully generated your entry passes. A PDF containing your individual ticket QR codes is attached to this email.</p>
            
            <div class="detail-box">
              <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
              <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${eventDate}</span></div>
              <div class="detail-row"><span class="detail-label">Venue</span><span class="detail-value">${venue}</span></div>
              <div class="detail-row"><span class="detail-label">Booking Reference</span><span class="detail-value" style="font-family:monospace;">${bookingRef}</span></div>
            </div>
            
            <p><strong>Instructions at the Gate:</strong></p>
            <p style="font-size: 14px;">Please open the attached PDF and present the QR codes for each guest to the gate staff. You can also view these passes on your phone by logging into your dashboard.</p>
            
            <div class="btn-container">
              <a href="${config.frontendUrl}/dashboard/bookings" class="button">View Passes on Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to,
    subject: `🎟️ Your Event Passes: ${eventTitle}`,
    html,
    attachments: [
      {
        filename: `Tickets_${bookingRef}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

// 3. 24-Hour Reminder Email
export const send24HourReminderEmail = async (
  to: string,
  name: string,
  eventTitle: string,
  eventDate: string,
  startTime: string,
  venue: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${commonStyles}
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
            <h1>⏰ Tomorrow is the Day!</h1>
            <p>24-hour reminder for ${eventTitle}</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>This is a friendly reminder that <strong>${eventTitle}</strong> starts tomorrow! We are super excited to host you. Here are the event logistics to help you plan your day:</p>
            
            <div class="detail-box">
              <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
              <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${eventDate}</span></div>
              <div class="detail-row"><span class="detail-label">Gate Starts At</span><span class="detail-value">${startTime}</span></div>
              <div class="detail-row"><span class="detail-label">Venue</span><span class="detail-value">${venue}</span></div>
            </div>
            
            <p>Make sure you have your digital QR codes ready on your phone for a quick check-in at the gate entrance.</p>

            <div class="btn-container">
              <a href="${config.frontendUrl}/dashboard/bookings" class="button" style="background-color:#d97706; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.2);">Get Digital Tickets</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject: `⏰ Reminder: ${eventTitle} is tomorrow!`, html });
};

// 4. 1-Hour Reminder Email
export const send1HourReminderEmail = async (
  to: string,
  name: string,
  eventTitle: string,
  venue: string,
  startTime: string,
  bookingRef: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${commonStyles}
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header" style="background: linear-gradient(135deg, #ec4899, #db2777);">
            <h1>🚀 Starting in 1 Hour!</h1>
            <p>Gate check-in is now open for ${eventTitle}</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>The countdown is over! <strong>${eventTitle}</strong> is starting in just one hour. Gates are open and staff are ready to scan you in.</p>
            
            <div class="detail-box">
              <div class="detail-row"><span class="detail-label">Venue</span><span class="detail-value">${venue}</span></div>
              <div class="detail-row"><span class="detail-label">Starts At</span><span class="detail-value">${startTime}</span></div>
            </div>

            <p>For quick entry, keep your booking reference code ready or show your ticket QR code on your phone browser:</p>
            
            <div class="ref-badge" style="border-color:#db2777; color:#db2777; background-color:#fff1f2;">
              <span style="display:block; font-size:10px; color:#718096; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px; margin-bottom:4px;">Check-In Code</span>
              <span>${bookingRef}</span>
            </div>

            <div class="btn-container">
              <a href="${config.frontendUrl}/dashboard/bookings" class="button" style="background-color:#db2777; box-shadow: 0 4px 12px rgba(219, 39, 119, 0.2);">Open Ticket Pass</a>
            </div>
            
            <p style="font-size:12px; color:#718096; text-align:center;">Safe travels! See you inside. 🌟</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject: `🚀 Happening Now: ${eventTitle} starts in 1 hour!`, html });
};

// 5. Event Details Update Email
export const sendEventUpdateEmail = async (
  to: string,
  name: string,
  eventTitle: string,
  changesSummary: string,
  eventDate: string,
  venue: string,
  eventSlug: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${commonStyles}
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
            <h1>ℹ️ Event Schedule Updated</h1>
            <p>Schedule details changed for ${eventTitle}</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Please note that the organizer has updated the details for <strong>${eventTitle}</strong>. Here is a summary of the updates:</p>
            
            <div class="ref-badge" style="border-color:#1d4ed8; color:#1d4ed8; background-color:#eff6ff; font-family:inherit; font-size:13px; font-weight:normal; text-align:left; line-height:1.5;">
              <strong style="display:block; font-size:11px; text-transform:uppercase; font-weight:bold; color:#718096; margin-bottom:4px;">Important Updates:</strong>
              ${changesSummary}
            </div>

            <p><strong>Current Event Schedule:</strong></p>
            <div class="detail-box">
              <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventTitle}</span></div>
              <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${eventDate}</span></div>
              <div class="detail-row"><span class="detail-label">Venue</span><span class="detail-value">${venue}</span></div>
            </div>

            <div class="btn-container">
              <a href="${config.frontendUrl}/events/${eventSlug}" class="button" style="background-color:#1d4ed8; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);">View Event Details</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject: `ℹ️ Update: Details changed for ${eventTitle}`, html });
};

// 6. Event Cancellation Email
export const sendEventCancellationEmail = async (
  to: string,
  name: string,
  eventTitle: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${commonStyles}
    </head>
    <body>
      <div class="wrapper">
        <div class="card bg-white border border-red-200">
          <div class="header" style="background: linear-gradient(135deg, #ef4444, #b91c1c);">
            <h1>⚠️ Event Cancelled</h1>
            <p>Cancellation notice for ${eventTitle}</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We regret to inform you that the event <strong>${eventTitle}</strong> has been cancelled by the organizer.</p>
            
            <div class="detail-box" style="background-color:#fff5f5; border-color:#fed7d7;">
              <div class="detail-row" style="border-bottom-color:#feb2b2;"><span class="detail-label">Event</span><span class="detail-value text-red-600">${eventTitle}</span></div>
              <div class="detail-row" style="border-bottom:none;"><span class="detail-label">Status</span><span class="detail-value highlight-red">CANCELLED</span></div>
            </div>

            <p><strong>Refund Information:</strong></p>
            <p style="font-size: 14px; color:#4a5568;">Your booking is being marked for cancellation. A full refund of your transaction amount will be processed automatically back to your payment gateway. This typically takes 5-7 business days to reflect in your account.</p>
            
            <p>We apologize for the inconvenience this cancellation causes. If you have any questions, please contact the support desk.</p>
            
            <div class="btn-container">
              <a href="mailto:support@eventsphere.com" class="button" style="background-color:#b91c1c; box-shadow: 0 4px 12px rgba(185, 28, 28, 0.2);">Contact Support</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject: `⚠️ Cancellation Notice: ${eventTitle}`, html });
};

// 7. Welcome Email
export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${commonStyles}
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <h1>Welcome to EventSphere! 🌟</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Welcome to <strong>EventSphere</strong> — your smart event management platform!</p>
            <p>Discover amazing experiences, buy tickets securely, and participate in live event communities.</p>
            <p>Start exploring upcoming conferences, music festivals, and workshops today!</p>
            
            <div class="btn-container">
              <a href="${config.frontendUrl}/events" class="button">Explore Events Now</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject: 'Welcome to EventSphere! 🎉', html });
};
