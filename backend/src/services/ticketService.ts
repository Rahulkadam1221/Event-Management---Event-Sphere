import { PrismaClient, Event, TicketTier } from '@prisma/client';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { sendTicketEmail } from './emailService';

const prisma = new PrismaClient();

// Helper to format dates inside PDFs
const formatPdfDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const ticketService = {
  // 1. Generate HMAC signature for ticket security
  generateSignature: (ticketId: string): string => {
    return crypto.createHmac('sha256', config.jwt.secret).update(ticketId).digest('hex');
  },

  // 2. Verify ticket HMAC signature
  verifySignature: (ticketId: string, sig: string): boolean => {
    try {
      const expected = ticketService.generateSignature(ticketId);
      if (expected.length !== sig.length) return false;
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  },

  // 3. Main process to create tickets, draw PDF, and email them
  processConfirmedBooking: async (bookingId: string): Promise<void> => {
    logger.info(`Processing ticket generation for booking ${bookingId}`);

    // Fetch booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        ticketTier: true,
        user: true,
      },
    });

    if (!booking) {
      logger.error(`Booking ${bookingId} not found, skipping ticket generation`);
      return;
    }

    // Check if tickets are already generated
    const existingTicketsCount = await prisma.ticket.count({
      where: { bookingId },
    });

    let tickets: any[] = [];

    if (existingTicketsCount === 0) {
      // Create individual Ticket records
      const ticketPromises = [];
      for (let i = 0; i < booking.ticketCount; i++) {
        const ticketNumber = `TIC-${booking.bookingReference.substring(0, 8).toUpperCase()}-${i + 1}`;
        
        ticketPromises.push(
          prisma.ticket.create({
            data: {
              ticketNumber,
              attendeeName: booking.user.name,
              attendeeEmail: booking.user.email,
              bookingId: booking.id,
              ticketTierId: booking.ticketTierId,
            },
          })
        );
      }
      tickets = await Promise.all(ticketPromises);
      logger.info(`Created ${tickets.length} individual ticket records for booking ${bookingId}`);
    } else {
      tickets = await prisma.ticket.findMany({
        where: { bookingId },
      });
      logger.info(`Using ${tickets.length} existing ticket records for booking ${bookingId}`);
    }

    // Generate validation QR codes for each ticket
    for (const ticket of tickets) {
      if (!ticket.qrCode) {
        const sig = ticketService.generateSignature(ticket.id);
        const validationPayload = `TIC-${ticket.id}.${sig}`;
        
        // Save QR code base64 image
        const qrCodeDataUrl = await QRCode.toDataURL(validationPayload, {
          margin: 1,
          width: 300,
        });

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { qrCode: qrCodeDataUrl },
        });

        ticket.qrCode = qrCodeDataUrl;
      }
    }

    // Draw the PDF
    try {
      const pdfBuffer = await ticketService.generateTicketPdfBuffer(booking.event, booking.ticketTier, tickets, booking.user.name);
      
      // Save local scratch copy for debugging/development verification
      const scratchDir = path.join(process.cwd(), 'scratch', 'tickets');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      const localPdfPath = path.join(scratchDir, `Tickets_${booking.bookingReference}.pdf`);
      fs.writeFileSync(localPdfPath, pdfBuffer);
      logger.info(`Saved ticket PDF locally at: ${localPdfPath}`);

      // Email the PDF
      await sendTicketEmail(
        booking.user.email,
        booking.user.name,
        booking.event.title,
        booking.bookingReference,
        formatPdfDate(booking.event.startDate),
        `${booking.event.venue}, ${booking.event.city}`,
        pdfBuffer
      );
    } catch (err) {
      logger.error(`Error generating/emailing ticket PDF for booking ${bookingId}`, err);
    }
  },

  // 4. Draw PDF using pdfkit and return buffer
  generateTicketPdfBuffer: async (
    event: Event,
    tier: TicketTier,
    tickets: any[],
    buyerName: string
  ): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      tickets.forEach((ticket, idx) => {
        if (idx > 0) doc.addPage();

        // 1. Sleek Top Gradient Banner
        // Draw banner rectangle
        doc.rect(40, 40, 515, 100).fill('#4f46e5');
        
        // Brand Name
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('EVENTSPHERE SMART PASS', 60, 55);
        
        // Event Title
        doc.fontSize(22).text(event.title, 60, 75, { width: 475, height: 40, ellipsis: true });
        
        // Category Badge Overlay
        doc.rect(460, 55, 75, 18).fill('#6366f1');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text(event.category.toUpperCase(), 460, 60, { width: 75, align: 'center' });

        // Reset fill for text drawing
        doc.fillColor('#111827');

        // 2. Draw Main Box borders
        doc.rect(40, 140, 515, 260).stroke('#e5e7eb');
        
        // 3. Left Information Column
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('TICKET HOLDER', 60, 165);
        doc.font('Helvetica').fontSize(14).fillColor('#111827').text(ticket.attendeeName || buyerName, 60, 180);

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('TICKET TIER', 260, 165);
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#4f46e5').text(tier.name, 260, 180);

        // Horizontal Separator
        doc.moveTo(60, 215).lineTo(340, 215).stroke('#f3f4f6');

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('TICKET NUMBER', 60, 235);
        doc.font('Helvetica-Oblique').fontSize(11).fillColor('#111827').text(ticket.ticketNumber, 60, 250);

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('ADMISSION PRICE', 260, 235);
        doc.font('Helvetica').fontSize(11).fillColor('#111827').text(`INR ${tier.price.toLocaleString('en-IN')}`, 260, 250);

        // Horizontal Separator
        doc.moveTo(60, 285).lineTo(340, 285).stroke('#f3f4f6');

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('DATE & TIME', 60, 305);
        doc.font('Helvetica').fontSize(11).fillColor('#111827').text(`${formatPdfDate(event.startDate)}`, 60, 320);
        doc.fontSize(10).fillColor('#4b5563').text(`Starts at ${event.startTime}`, 60, 335);

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('VENUE LOCATION', 60, 365);
        doc.font('Helvetica').fontSize(10).fillColor('#111827').text(event.venue, 60, 380, { width: 280, height: 15, ellipsis: true });
        doc.fontSize(9).fillColor('#4b5563').text(`${event.address}, ${event.city}`, 60, 395, { width: 280, height: 25, ellipsis: true });

        // 4. Right QR Code Box
        // Inner QR divider line
        doc.moveTo(370, 150).lineTo(370, 390).stroke('#f3f4f6');

        // Extract raw Base64 data from QR dataUrl
        const qrBase64 = ticket.qrCode.split(',')[1];
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        doc.image(qrBuffer, 385, 175, { width: 155, height: 155 });

        doc.font('Helvetica').fontSize(8).fillColor('#9ca3af').text('SCAN AT THE GATE', 370, 345, { width: 185, align: 'center' });

        // 5. Bottom Security Footer
        doc.rect(40, 410, 515, 45).fill('#f9fafb');
        doc.fillColor('#9ca3af').fontSize(8).font('Helvetica').text(
          'IMPORTANT NOTICE: This pass is unique and personalized. Gate staff will scan the secure QR code to verify check-in authorization. Do not share or duplicate this document. Duplicate entry attempts are blocked.',
          50,
          422,
          { width: 495, align: 'center', lineGap: 2 }
        );
      });

      doc.end();
    });
  },
};
