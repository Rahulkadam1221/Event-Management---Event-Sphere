import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { CustomError } from '../utils/customError';
import { AuthenticatedRequest } from '../types';
import { ticketService } from '../services/ticketService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const getMyTickets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const tickets = await prisma.ticket.findMany({
    where: {
      booking: {
        userId: userId,
      },
    },
    include: {
      booking: {
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              title: true,
              category: true,
              startDate: true,
              venue: true,
              city: true,
              bannerUrl: true,
            },
          },
          ticketTier: {
            select: {
              name: true,
              type: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, tickets, 'My tickets fetched successfully');
});

export const getTicketPdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          event: true,
          ticketTier: true,
          user: true,
        },
      },
    },
  });

  if (!ticket) {
    throw CustomError.notFound('Ticket not found');
  }

  // Authorization Check: Must be the buyer, organizer, or admin
  const isBuyer = ticket.booking.userId === req.user!.id;
  const isOrganizer = ticket.booking.event.organizerId === req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN';

  if (!isBuyer && !isOrganizer && !isAdmin) {
    throw CustomError.forbidden('You are not authorized to download this ticket PDF');
  }

  try {
    const pdfBuffer = await ticketService.generateTicketPdfBuffer(
      ticket.booking.event,
      ticket.booking.ticketTier,
      [ticket],
      ticket.booking.user.name
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ticket_${ticket.ticketNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error(`Error generating PDF for ticket ${id}`, error);
    throw CustomError.internal('Failed to generate ticket PDF');
  }
});

export const verifyTicketCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  let { code, action = 'CHECK_IN' } = req.body;

  if (code && typeof code === 'string') {
    code = code.trim();
  }

  logger.info(`Gate validation scan received: "${code}" (Action: ${action})`);

  if (!code || typeof code !== 'string' || !code.startsWith('TIC-')) {
    throw CustomError.badRequest('Invalid QR code format');
  }

  if (action !== 'CHECK_IN' && action !== 'CHECK_OUT') {
    throw CustomError.badRequest('Invalid scan action. Must be CHECK_IN or CHECK_OUT.');
  }

  let ticketId: string | null = null;
  const hasDot = code.includes('.');

  if (hasDot) {
    const payload = code.substring(4); // Remove "TIC-"
    const dotIndex = payload.indexOf('.');
    if (dotIndex === -1) {
      throw CustomError.badRequest('Invalid QR code parameters');
    }

    ticketId = payload.substring(0, dotIndex);
    const signature = payload.substring(dotIndex + 1);

    // 1. Secure Access: Signature Verification
    const isSignatureValid = ticketService.verifySignature(ticketId, signature);
    if (!isSignatureValid) {
      throw CustomError.badRequest('Invalid cryptographic ticket signature. Access denied.');
    }
  }

  // 2. Query Ticket Details (by UUID id if QR payload, or by ticketNumber if manual passcode)
  const ticket = await prisma.ticket.findFirst({
    where: hasDot ? { id: ticketId! } : { ticketNumber: code },
    include: {
      booking: {
        include: {
          event: true,
          user: { select: { id: true, name: true, email: true } },
          ticketTier: { select: { name: true, type: true, price: true } },
        },
      },
      attendances: {
        include: {
          scanner: { select: { name: true } },
        },
      },
    },
  });

  if (!ticket) {
    throw CustomError.notFound('Ticket records not found in database');
  }

  const event = ticket.booking.event;

  // 3. Authorization Check: Must be event organizer or admin
  if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden('You are not authorized to scan passes for this event');
  }

  // 4. Check Status (Cancelled/Refunded)
  if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
    res.status(200).json({
      success: false,
      message: `Access denied. Ticket is ${ticket.status.toLowerCase()}`,
      data: { ticket },
    });
    return;
  }

  // 5. Check Action-specific duplicates
  if (action === 'CHECK_IN') {
    if (ticket.isCheckedIn) {
      res.status(200).json({
        success: false,
        message: 'Duplicate check-in attempt blocked. Guest is already inside.',
        data: {
          ticket,
          checkedInAt: ticket.lastCheckedInAt,
        },
      });
      return;
    }

    // Perform check-in: Update ticket and create SUCCESS log
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        isCheckedIn: true,
        lastCheckedInAt: new Date(),
      },
    });

    const attendance = await prisma.attendance.create({
      data: {
        ticketId: ticket.id,
        scannerId: req.user!.id,
        status: 'SUCCESS',
        type: 'CHECK_IN',
        notes: 'Checked-in via gate QR scan',
      },
      include: {
        scanner: { select: { name: true } },
      },
    });

    // Update overall Booking check-in stats
    await prisma.booking.update({
      where: { id: ticket.bookingId },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
    });

    // Query live statistics for event
    const totalTickets = await prisma.ticket.count({
      where: { booking: { eventId: event.id }, status: 'ACTIVE' }
    });
    const liveCheckedInCount = await prisma.ticket.count({
      where: { booking: { eventId: event.id }, status: 'ACTIVE', isCheckedIn: true }
    });
    const checkedOutCount = await prisma.ticket.count({
      where: { booking: { eventId: event.id }, status: 'ACTIVE', isCheckedIn: false, lastCheckedOutAt: { not: null } }
    });

    sendSuccess(
      res,
      {
        ticket: updatedTicket,
        attendance,
        stats: {
          totalTickets,
          liveCheckedInCount,
          checkedOutCount,
          attendanceRate: totalTickets > 0 ? Math.round((liveCheckedInCount / totalTickets) * 100) : 0
        }
      },
      'Check-in successful. Welcome to the event!'
    );
  } else {
    // CHECK_OUT Action
    if (!ticket.isCheckedIn) {
      res.status(200).json({
        success: false,
        message: 'Guest is already checked out / not registered inside the venue.',
        data: {
          ticket,
        },
      });
      return;
    }

    // Perform check-out: Update ticket and create SUCCESS log
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        isCheckedIn: false,
        lastCheckedOutAt: new Date(),
      },
    });

    const attendance = await prisma.attendance.create({
      data: {
        ticketId: ticket.id,
        scannerId: req.user!.id,
        status: 'SUCCESS',
        type: 'CHECK_OUT',
        notes: 'Checked-out via gate QR scan',
      },
      include: {
        scanner: { select: { name: true } },
      },
    });

    // Query live statistics for event
    const totalTickets = await prisma.ticket.count({
      where: { booking: { eventId: event.id }, status: 'ACTIVE' }
    });
    const liveCheckedInCount = await prisma.ticket.count({
      where: { booking: { eventId: event.id }, status: 'ACTIVE', isCheckedIn: true }
    });
    const checkedOutCount = await prisma.ticket.count({
      where: { booking: { eventId: event.id }, status: 'ACTIVE', isCheckedIn: false, lastCheckedOutAt: { not: null } }
    });

    sendSuccess(
      res,
      {
        ticket: updatedTicket,
        attendance,
        stats: {
          totalTickets,
          liveCheckedInCount,
          checkedOutCount,
          attendanceRate: totalTickets > 0 ? Math.round((liveCheckedInCount / totalTickets) * 100) : 0
        }
      },
      'Check-out successful. Goodbye!'
    );
  }
});

export const getAttendanceStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw CustomError.notFound('Event not found');
  if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }

  const totalTickets = await prisma.ticket.count({
    where: { booking: { eventId }, status: 'ACTIVE' }
  });
  const liveCheckedInCount = await prisma.ticket.count({
    where: { booking: { eventId }, status: 'ACTIVE', isCheckedIn: true }
  });
  const checkedOutCount = await prisma.ticket.count({
    where: { booking: { eventId }, status: 'ACTIVE', isCheckedIn: false, lastCheckedOutAt: { not: null } }
  });

  sendSuccess(res, {
    totalTickets,
    liveCheckedInCount,
    checkedOutCount,
    attendanceRate: totalTickets > 0 ? Math.round((liveCheckedInCount / totalTickets) * 100) : 0
  }, 'Attendance statistics fetched successfully');
});

export const getAttendanceLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw CustomError.notFound('Event not found');
  if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw CustomError.forbidden();
  }

  const logs = await prisma.attendance.findMany({
    where: {
      ticket: {
        booking: {
          eventId
        }
      }
    },
    include: {
      ticket: {
        select: {
          ticketNumber: true,
          attendeeName: true,
          attendeeEmail: true,
          ticketTier: { select: { name: true } }
        }
      },
      scanner: {
        select: {
          name: true
        }
      }
    },
    orderBy: { checkedInAt: 'desc' },
    take: 100
  });

  sendSuccess(res, logs, 'Attendance logs fetched successfully');
});
