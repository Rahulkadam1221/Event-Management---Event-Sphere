export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type TicketType = 'FREE' | 'GENERAL' | 'VIP' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  bio?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface TicketTier {
  id: string;
  name: string;
  type: TicketType;
  price: number;
  quantity: number;
  sold: number;
  description?: string;
  perks?: string[];
  isActive: boolean;
  eventId: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc?: string;
  bannerUrl?: string;
  category: string;
  tags: string[];
  venue: string;
  address: string;
  city: string;
  state: string;
  country: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  availableSeats: number;
  latitude?: number;
  longitude?: number;
  isFeatured: boolean;
  isTrending: boolean;
  status: EventStatus;
  organizerId: string;
  organizer: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
  ticketTiers: TicketTier[];
  _count?: {
    bookings: number;
    messages?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  bookingReference: string;
  ticketCount: number;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  couponCode?: string;
  status: BookingStatus;
  paymentId?: string;
  paymentOrderId?: string;
  paymentSignature?: string;
  qrCode?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  notes?: string;
  userId: string;
  eventId: string;
  ticketTierId: string;
  event: Partial<Event>;
  ticketTier: Partial<TicketTier>;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  eventId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    role: UserRole;
  };
  reactions: ChatReaction[];
  createdAt: string;
}

export interface ChatReaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  user: { id: string; name: string };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  eventId?: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalEvents: number;
  totalRevenue: number;
  totalTicketsSold: number;
  overallAttendanceRate: number;
}

export interface ChartDataPoint {
  day: string;
  revenue: number;
  tickets: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  paymentReference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  gateway: string;
  createdAt: string;
  updatedAt: string;
  bookingId: string;
  booking: {
    id: string;
    bookingReference: string;
    ticketCount: number;
    unitPrice: number;
    totalAmount: number;
    status: BookingStatus;
    event: {
      title: string;
      category: string;
      startDate: string;
    };
    ticketTier: {
      name: string;
    };
    user?: {
      name: string;
      email: string;
    };
  };
}

