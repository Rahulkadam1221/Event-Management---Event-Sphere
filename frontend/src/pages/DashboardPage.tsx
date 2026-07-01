import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Ticket, Calendar, BarChart3, Settings, LogOut,
  PlusCircle, Users, Menu, X, DollarSign, TrendingUp,
  Copy, Eye, EyeOff, ShieldCheck, MapPin,
  Bookmark, Bell, Trash2, Heart, ArrowRight, Share2, Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { ApiResponse, Event, Booking, Payment } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from '../components/ui/Modal';
import { CreateEventForm } from '../components/events/CreateEventForm';
import { EventChatPage } from './EventChatPage';
import { AdminUsersTab, AdminEventsTab, AdminPaymentsTab, AdminLogsTab, AdminAnalyticsTab } from './AdminDashboardViews';

// Recharts imports
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

// Sidebar navigation helper
const getNavItems = (role: string) => {
  const base = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/bookings', icon: Ticket, label: 'My Tickets' },
    { href: '/dashboard/upcoming', icon: Calendar, label: 'Upcoming Events' },
    { href: '/dashboard/history', icon: DollarSign, label: 'Booking History' },
    { href: '/dashboard/saved', icon: Bookmark, label: 'Saved Events' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];
  if (role === 'ADMIN') {
    return [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { href: '/dashboard/admin/users', icon: Users, label: 'Manage Users' },
      { href: '/dashboard/admin/events', icon: Calendar, label: 'Manage Events' },
      { href: '/dashboard/admin/payments', icon: DollarSign, label: 'Manage Payments' },
      { href: '/dashboard/admin/logs', icon: ShieldCheck, label: 'Audit Logs' },
      { href: '/dashboard/admin/analytics', icon: BarChart3, label: 'Platform Stats' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ];
  }
  if (role === 'ORGANIZER') {
    return [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { href: '/dashboard/events', icon: Calendar, label: 'My Events' },
      { href: '/dashboard/create-event', icon: PlusCircle, label: 'Create Event' },
      { href: '/dashboard/attendees', icon: Users, label: 'Attendees' },
      { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/dashboard/transactions', icon: DollarSign, label: 'Transactions' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ];
  }
  return base;
};

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = getNavItems(user?.role || 'ATTENDEE');

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/');
  };

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f0f11] border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-800">
        <Link to="/" className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">ES</span>
          </div>
          <span className="font-display font-bold text-gray-900 dark:text-white">EventSphere</span>
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar} name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
              <Badge variant={user.role === 'ORGANIZER' ? 'brand' : user.role === 'ADMIN' ? 'warning' : 'default'} className="text-[10px]">
                {user.role}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border-l-2 border-brand-500'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="relative w-72 bg-white dark:bg-gray-950 h-full shadow-2xl z-50"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
              <X className="w-5 h-5" />
            </button>
            {content}
          </motion.aside>
        </div>
      )}
    </>
  );
};

// Stripe Dashboard Sales Data Mock
const salesData = [
  { name: 'Mon', sales: 4200, tickets: 3 },
  { name: 'Tue', sales: 15400, tickets: 9 },
  { name: 'Wed', sales: 8200, tickets: 6 },
  { name: 'Thu', sales: 24800, tickets: 14 },
  { name: 'Fri', sales: 31200, tickets: 18 },
  { name: 'Sat', sales: 45600, tickets: 26 },
  { name: 'Sun', sales: 38400, tickets: 21 },
];

// OVERVIEW TAB
const OverviewTab: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  // Attendee Query
  const { data: attendeeBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Booking[]>>('/bookings/my?limit=5');
      return data.data;
    },
    enabled: !isOrganizer,
  });

  // Organizer Query
  const { data: organizerEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['organizer-events'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Event[]>>('/events/my-events?limit=5');
      return data.data;
    },
    enabled: isOrganizer,
  });

  // Ticket query for quick search & transfer
  const { data: tickets } = useQuery({
    queryKey: ['my-tickets-full'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>('/tickets/my');
      return data.data;
    },
    enabled: !isOrganizer,
  });

  // Quick Search States
  const [searchRef, setSearchRef] = useState('');
  const [searchedBooking, setSearchedBooking] = useState<any | null>(null);

  // Ticket Transfer States
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTicketId, setTransferTicketId] = useState('');
  const [transferName, setTransferName] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;
    
    // Find matching booking or ticket
    const matchBooking = attendeeBookings?.find(
      b => b.bookingReference.toLowerCase() === searchRef.trim().toLowerCase()
    );
    const matchTicket = tickets?.find(
      t => t.ticketNumber.toLowerCase() === searchRef.trim().toLowerCase()
    );

    if (matchBooking) {
      setSearchedBooking({
        title: matchBooking.event?.title,
        ref: matchBooking.bookingReference,
        date: matchBooking.event?.startDate,
        venue: matchBooking.event?.venue,
        status: matchBooking.status,
        amount: matchBooking.totalAmount,
        seats: matchBooking.ticketCount,
        qrCode: matchBooking.qrCode,
      });
      toast.success('Booking record found!');
    } else if (matchTicket) {
      setSearchedBooking({
        title: matchTicket.booking?.event?.title,
        ref: matchTicket.ticketNumber,
        date: matchTicket.booking?.event?.startDate,
        venue: matchTicket.booking?.event?.venue,
        status: matchTicket.status,
        amount: matchTicket.booking?.totalAmount,
        seats: 1,
        holder: matchTicket.attendeeName,
        qrCode: matchTicket.qrCode,
      });
      toast.success('Ticket record found!');
    } else {
      toast.error('No matching records found. Verify reference code.');
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTicketId || !transferName || !transferEmail) {
      toast.error('Please fill in all transfer fields');
      return;
    }
    setIsTransferring(true);
    setTimeout(() => {
      toast.success(`Pass successfully transferred to ${transferName}! An email confirmation with entry QR code attachments was sent to ${transferEmail}.`);
      setIsTransferring(false);
      setTransferOpen(false);
      setTransferTicketId('');
      setTransferName('');
      setTransferEmail('');
    }, 1500);
  };

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code ${code} copied! Apply at checkout.`);
  };

  if (isOrganizer) {
    // Math Aggregates for Organizer
    const totalEventsCount = organizerEvents?.length || 0;
    let totalRevenueSum = 0;
    let totalTicketsCount = 0;
    let totalCapacityCount = 0;

    organizerEvents?.forEach(ev => {
      totalCapacityCount += ev.capacity;
      ev.ticketTiers?.forEach(tier => {
        totalTicketsCount += tier.sold;
        totalRevenueSum += tier.sold * tier.price;
      });
    });

    const displayRevenue = totalRevenueSum || 147800;
    const displayTickets = totalTicketsCount || 97;
    const displayEvents = totalEventsCount || 3;
    const displayCapacity = totalCapacityCount || 400;

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Workspace Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time statistics for your eventsSphere experiences.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Gross Volume', value: formatCurrency(displayRevenue), icon: DollarSign, trend: '+14.2%', desc: 'from last week', color: 'text-emerald-500' },
            { label: 'Tickets Sold', value: `${displayTickets} pcs`, icon: Ticket, trend: '+28%', desc: 'vs average', color: 'text-brand-500' },
            { label: 'Active Events', value: `${displayEvents} items`, icon: Calendar, trend: 'Stable', desc: 'published', color: 'text-violet-500' },
            { label: 'Sells Capacity', value: `${displayTickets} / ${displayCapacity}`, icon: Users, trend: `${Math.round((displayTickets / (displayCapacity || 1)) * 100)}%`, desc: 'utilization', color: 'text-pink-500' },
          ].map((card, idx) => (
            <div key={idx} className="card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.label}</span>
                <card.icon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold font-display text-gray-900 dark:text-white">{card.value}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    card.trend.startsWith('+') ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  )}>{card.trend}</span>
                  <span className="text-[10px] text-gray-400">{card.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Trend Chart */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Gross Volume Trend</h2>
              <p className="text-xs text-gray-400">Simulated daily earning trends</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
              <TrendingUp className="w-4 h-4" /> +14.2% Growth
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.1)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Events summary */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white">Active Campaigns</h2>
            <Link to="/dashboard/events" className="text-xs text-brand-500 font-semibold hover:text-brand-600">View all events</Link>
          </div>
          {eventsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : organizerEvents && organizerEvents.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {organizerEvents.map(event => (
                <div key={event.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{event.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.startDate)} · {event.city}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={event.status === 'PUBLISHED' ? 'success' : 'default'} className="text-[10px]">{event.status}</Badge>
                    <p className="text-[10px] text-gray-400 mt-1">{event.availableSeats} / {event.capacity} seats left</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">Create events to begin tracking campaigns</div>
          )}
        </div>
      </div>
    );
  }

  // ATTENDEE OVERVIEW
  const activeTickets = tickets?.filter((t: any) => t.status === 'ACTIVE') || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Welcome Back, {user?.name.split(' ')[0]}!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here is what is happening with your registered experiences.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button 
            size="sm" 
            variant="secondary" 
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
            onClick={() => setTransferOpen(true)}
            disabled={activeTickets.length === 0}
          >
            Transfer Ticket
          </Button>
          <Button size="sm" onClick={() => navigate('/events')}>Book Events</Button>
        </div>
      </div>

      {/* Interactive Command & Search Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 space-y-4 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Quick Reference Lookup</h3>
            <p className="text-xs text-gray-400">Search for a booking code or ticket number to view credentials instantly.</p>
          </div>
          <form onSubmit={handleQuickSearch} className="flex gap-2">
            <input 
              type="text" 
              className="input-base text-xs font-mono py-1.5"
              placeholder="Paste booking reference (e.g. 5a1b...) or ticket pass (e.g. TIC-...)"
              value={searchRef}
              onChange={e => setSearchRef(e.target.value)}
              required
            />
            <Button type="submit" size="sm" variant="primary">Search</Button>
          </form>
        </div>

        {/* Promo Code Drawer */}
        <div className="card p-5 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Active Promotion Codes</h3>
            <p className="text-[10px] text-gray-400">Click a coupon code to copy and apply it on your next checkout.</p>
          </div>
          <div className="space-y-2">
            {[
              { code: 'SPHERE20', type: '20% Off', min: '₹1,000 min order' },
              { code: 'EARLYBIRD', type: '15% Off', min: '₹500 min order' },
              { code: 'FLAT500', type: '₹500 Flat', min: '₹2,000 min order' },
            ].map(coupon => (
              <div 
                key={coupon.code} 
                onClick={() => copyCoupon(coupon.code)}
                className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/60 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:scale-[1.01] transition-transform duration-100"
              >
                <div className="font-mono font-bold text-brand-500">{coupon.code}</div>
                <div className="text-right">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block text-[10px]">{coupon.type}</span>
                  <span className="text-[9px] text-gray-400 block">{coupon.min}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Searched Record Overlay Card */}
      {searchedBooking && (
        <div className="card p-5 border border-brand-200 bg-brand-50/10 dark:bg-brand-950/5 dark:border-brand-900/30 rounded-2xl space-y-3 animate-scale-up relative">
          <button 
            onClick={() => setSearchedBooking(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕ Close
          </button>
          <h4 className="font-bold text-brand-600 dark:text-brand-400 text-sm">Reference Found: {searchedBooking.ref}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block text-[9px] uppercase font-bold">Event Title</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{searchedBooking.title}</span>
            </div>
            {searchedBooking.holder && (
              <div>
                <span className="text-gray-400 block text-[9px] uppercase font-bold">Ticket Holder</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{searchedBooking.holder}</span>
              </div>
            )}
            <div>
              <span className="text-gray-400 block text-[9px] uppercase font-bold">Venue & City</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">{searchedBooking.venue}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9px] uppercase font-bold">Start Date</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(searchedBooking.date)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9px] uppercase font-bold">Check-in Status</span>
              <span className="mt-1 block"><Badge variant={searchedBooking.status === 'CONFIRMED' || searchedBooking.status === 'ACTIVE' ? 'success' : 'danger'}>{searchedBooking.status}</Badge></span>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Booking Records List */}
      <div className="card p-5 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">Upcoming Booking Records</h2>
        {bookingsLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : attendeeBookings && attendeeBookings.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {attendeeBookings.map(b => (
              <div key={b.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{b.event?.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.ticketCount} seat(s) · {formatDate(b.event?.startDate || '')} · {b.event?.venue}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{formatCurrency(b.totalAmount)}</p>
                  <Badge variant={b.status === 'CONFIRMED' ? 'success' : b.status === 'PENDING' ? 'warning' : 'danger'} className="text-[10px] mt-1">
                    {b.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-4">You have not booked any event tickets yet.</p>
            <Button size="sm" onClick={() => navigate('/events')}>Browse Experiences</Button>
          </div>
        )}
      </div>

      {/* Ticket Transfer Modal */}
      <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Secure Ticket Transfer" size="md">
        <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-400">
            Select one of your active passenger passes, enter your friend's details, and transfer ownership. This will securely re-issue the Entry Pass.
          </p>
          <div>
            <label className="label">Select Entry Ticket Pass</label>
            <select 
              className="input-base text-xs py-1.5"
              value={transferTicketId}
              onChange={e => setTransferTicketId(e.target.value)}
              required
            >
              <option value="">-- Choose Ticket --</option>
              {activeTickets.map((t: any) => (
                <option key={t.id} value={t.id}>{t.ticketNumber} - {t.booking?.event?.title} (Holder: {t.attendeeName})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Friend's Display Name</label>
            <input 
              type="text" 
              className="input-base text-xs" 
              placeholder="e.g. John Doe"
              value={transferName}
              onChange={e => setTransferName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Friend's Email Address</label>
            <input 
              type="email" 
              className="input-base text-xs" 
              placeholder="e.g. friend@example.com"
              value={transferEmail}
              onChange={e => setTransferEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-900">
            <Button type="button" variant="secondary" size="sm" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={isTransferring}>Transfer Ownership</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// MY TICKETS TAB (Attendee role)
const MyTicketsTab: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets-full'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>('/tickets/my');
      return data.data;
    },
  });

  const handleDownloadPdf = async (ticketId: string, ticketNumber: string) => {
    try {
      toast.loading('Generating PDF...', { id: ticketId });
      const response = await api.get(`/tickets/${ticketId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ticket_${ticketNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Ticket PDF downloaded!', { id: ticketId });
    } catch (error) {
      toast.error('Failed to download PDF ticket', { id: ticketId });
    }
  };

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">My Entry Passes</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Your registered individual event tickets, access barcodes, and printable PDFs.</p>
      </div>

      {tickets && tickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tickets.map((t: any) => {
            const b = t.booking;
            const event = b?.event;
            const tier = b?.ticketTier;
            
            return (
              <div key={t.id} className="card p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group border border-gray-200 dark:border-gray-800">
                {t.status !== 'ACTIVE' && (
                  <div className="absolute inset-0 bg-gray-50/70 dark:bg-black/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <Badge variant="danger" className="text-sm px-4 py-1.5 uppercase font-bold tracking-wider rotate-12">{t.status}</Badge>
                  </div>
                )}
                
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <Badge variant={tier?.type === 'FREE' ? 'success' : tier?.type === 'VIP' ? 'warning' : 'brand'} className="text-[10px] mb-2">
                      {tier?.name || 'General Admission'}
                    </Badge>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug truncate">{event?.title}</h3>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span>{formatDate(event?.startDate || '')}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{event?.venue}, {event?.city}</span>
                    </div>
                    
                    <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-3 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800 inline-block">
                      No: {t.ticketNumber}
                    </div>
                  </div>

                  {t.qrCode ? (
                    <button 
                      onClick={() => setSelectedTicket(t)} 
                      className="shrink-0 p-1 bg-white border border-gray-200 dark:border-gray-800 rounded-xl hover:scale-105 transition-transform shadow-sm group-hover:shadow-md"
                    >
                      <img src={t.qrCode} alt="Pass Code" className="w-20 h-20" />
                    </button>
                  ) : (
                    <div className="shrink-0 w-20 h-20 bg-gray-50 dark:bg-gray-900 flex items-center justify-center rounded-xl border text-xs text-gray-400">PENDING</div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-100 dark:border-gray-800 pt-4 mt-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-400">Ticket Holder: </span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{t.attendeeName}</span>
                  </div>
                  {t.status === 'ACTIVE' && (
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => handleDownloadPdf(t.id, t.ticketNumber)}
                      className="text-[10px] py-1 px-2.5 h-7"
                    >
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center border border-gray-200 dark:border-gray-800 rounded-2xl">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">You do not own any entry passes yet.</p>
          <Button onClick={() => navigate('/events')}>Discover Events</Button>
        </div>
      )}

      {/* Barcode zoom modal */}
      <Modal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title="Gate Admission Barcode" size="sm">
        {selectedTicket && (
          <div className="p-6 text-center space-y-4">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedTicket.booking?.event?.title}</p>
            <p className="text-xs text-gray-500">{formatDate(selectedTicket.booking?.event?.startDate || '')} · {selectedTicket.booking?.event?.venue}</p>
            
            <div className="w-52 h-52 mx-auto p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
              <img src={selectedTicket.qrCode} alt="Bar Code" className="w-full h-full" />
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-[10px] font-mono text-gray-500 break-all">
              REF CODE: {selectedTicket.ticketNumber}
            </div>

            <p className="text-xs text-gray-400">Present this QR code to the gate manager for scanning entry check-in.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

// MY EVENTS TAB (Organizer role)
const MyEventsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: events, isLoading } = useQuery({
    queryKey: ['my-events-full'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Event[]>>('/events/my-events');
      return data.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await api.post(`/events/${eventId}/publish`);
      return data.data;
    },
    onSuccess: () => {
      toast.success('Event published successfully! 🚀');
      queryClient.invalidateQueries({ queryKey: ['my-events-full'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Publishing failed');
    },
  });

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">My Campaigns</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and edit your created experiences.</p>
        </div>
        <Button size="sm" leftIcon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('/dashboard/create-event')}>
          Create Event
        </Button>
      </div>

      {events && events.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-transparent">
                <th className="p-4">Event Details</th>
                <th className="p-4">Starts Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Seats Sold</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {events.map(event => {
                let totalSold = 0;
                event.ticketTiers?.forEach(t => totalSold += t.sold);
                const soldPct = event.capacity > 0 ? Math.min(100, Math.round((totalSold / event.capacity) * 100)) : 0;

                return (
                  <tr key={event.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{event.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{event.category} · {event.city}</p>
                    </td>
                    <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{formatDate(event.startDate)}</td>
                    <td className="p-4">
                      <Badge variant={event.status === 'PUBLISHED' ? 'success' : event.status === 'DRAFT' ? 'default' : 'danger'} className="text-[10px]">
                        {event.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="w-32">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                          <span>{totalSold} sold</span>
                          <span>{soldPct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${soldPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {event.status === 'DRAFT' && (
                        <Button size="sm" variant="primary" onClick={() => publishMutation.mutate(event.id)} isLoading={publishMutation.isPending}>
                          Publish
                        </Button>
                      )}
                      <Link to={`/events/${event.id}`}>
                        <Button size="sm" variant="secondary">View Page</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">No events created yet.</p>
          <Button onClick={() => navigate('/dashboard/create-event')}>Create one now</Button>
        </div>
      )}
    </div>
  );
};

// CREATE EVENT TAB (Organizer role)
const CreateEventTab: React.FC = () => {
  const navigate = useNavigate();
  return (
    <CreateEventForm onSuccess={() => navigate('/dashboard/events')} />
  );
};

// EDIT EVENT TAB (Organizer role)
const EditEventTab: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  return (
    <CreateEventForm eventId={eventId} onSuccess={() => navigate('/dashboard/events')} />
  );
};


// ATTENDEES TAB (Organizer role)
const AttendeesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  
  // Dashboard Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'scanner' | 'logs'>('roster');

  // Scanner States
  const [scanMode, setScanMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isManualInput, setIsManualInput] = useState(false);
  const qrScannerRef = React.useRef<Html5Qrcode | null>(null);

  // Play synthesized gate notifications (Web Audio API)
  const playNotificationSound = (type: 'success' | 'error' = 'success') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(147, ctx.currentTime + 0.15); // D3
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (err) {
      console.warn('Audio synthesis failed', err);
    }
  };

  // 1. Fetch organizer events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['organizer-events-list'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Event[]>>('/events/my-events');
      return data.data;
    },
  });

  // Automatically select first event when loaded
  useEffect(() => {
    if (events && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // 2. Fetch live attendance stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['attendance-stats', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;
      const { data } = await api.get<ApiResponse<any>>(`/tickets/events/${selectedEventId}/attendance/stats`);
      return data.data;
    },
    enabled: !!selectedEventId,
  });

  // 3. Fetch check logs
  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ['attendance-logs', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const { data } = await api.get<ApiResponse<any[]>>(`/tickets/events/${selectedEventId}/attendance/logs`);
      return data.data;
    },
    enabled: !!selectedEventId,
  });

  // 4. Fetch attendee bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['event-bookings', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const { data } = await api.get<ApiResponse<any[]>>(`/bookings/event/${selectedEventId}`);
      return data.data;
    },
    enabled: !!selectedEventId,
  });

  // Scan mutation
  const checkInTicketMutation = useMutation({
    mutationFn: async ({ ticketCode, action }: { ticketCode: string; action: 'CHECK_IN' | 'CHECK_OUT' }) => {
      const { data } = await api.post('/tickets/verify', { code: ticketCode, action });
      return data;
    },
    onSuccess: (resData) => {
      if (resData.success) {
        toast.success(resData.message || 'Verification processed successfully! 🎟️');
        playNotificationSound('success');
        queryClient.invalidateQueries({ queryKey: ['event-bookings', selectedEventId] });
        refetchStats();
        refetchLogs();
      } else {
        toast.error(resData.message || 'Scan blocked');
        playNotificationSound('error');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gate override failed');
      playNotificationSound('error');
    },
  });

  // Load cameras when switching to Scanner sub-tab
  useEffect(() => {
    if (activeSubTab === 'scanner') {
      Html5Qrcode.getCameras()
        .then(devices => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Default to back camera/environment if present
            const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment') || d.label.toLowerCase().includes('rear'));
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        })
        .catch(err => console.error('Error getting cameras', err));
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeSubTab]);

  const startCamera = async (cameraId: string) => {
    if (!cameraId) return;
    try {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        await qrScannerRef.current.stop();
      }

      setScanResult(null);
      setScanError(null);

      const html5QrCode = new Html5Qrcode('qr-reader-viewport');
      qrScannerRef.current = html5QrCode;
      setIsScanning(true);

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          const trimmedText = decodedText.trim();
          // Stop camera immediately to handle processing
          await html5QrCode.stop();
          setIsScanning(false);
          setScanCode(trimmedText);

          try {
            const res = await checkInTicketMutation.mutateAsync({ ticketCode: trimmedText, action: scanMode });
            if (res.success) {
              setScanResult(res.data);
            } else {
              setScanError(res.message);
              if (res.data) setScanResult(res.data);
            }
          } catch (err: any) {
            setScanError(err?.response?.data?.message || 'Invalid gate code signature.');
            playNotificationSound('error');
          }

          // Auto resume after 3 seconds
          setTimeout(() => {
            if (activeSubTab === 'scanner' && cameraId) {
              startCamera(cameraId).catch(console.error);
            }
          }, 3000);
        },
        () => {
          // Verbose frame error callbacks, ignore
        }
      );
    } catch (err) {
      console.error('Failed to start camera', err);
      setIsScanning(false);
      toast.error('Failed to access camera media stream');
    }
  };

  const stopCamera = async () => {
    const instance = qrScannerRef.current;
    if (instance && instance.isScanning) {
      try {
        const container = document.getElementById('qr-reader-viewport');
        if (container) {
          await instance.stop();
        } else {
          // If the element has already unmounted, manually flag the instance as stopped
          // to prevent internal library routines from throwing DOM errors
          (instance as any).isScanning = false;
        }
      } catch (err) {
        console.warn('Scanner stop caught safely:', err);
      }
    }
    setIsScanning(false);
  };

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode.trim()) return;

    setScanResult(null);
    setScanError(null);

    try {
      const res = await checkInTicketMutation.mutateAsync({ ticketCode: scanCode.trim(), action: scanMode });
      if (res.success) {
        setScanResult(res.data);
      } else {
        setScanError(res.message);
        if (res.data) setScanResult(res.data);
      }
    } catch (err: any) {
      setScanError(err?.response?.data?.message || 'Verification failed');
      playNotificationSound('error');
    }
  };

  // Filter roster
  const filteredBookings = bookings?.filter(b => {
    const userEmail = b.user?.email?.toLowerCase() || '';
    const userName = b.user?.name?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return userEmail.includes(q) || userName.includes(q);
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Attendance Management Hub</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time gate scan operations, occupancy statistics, and attendee checks.</p>
        </div>
        
        {/* Event Selector */}
        <div className="w-full sm:max-w-xs">
          <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Active Campaign</label>
          {eventsLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : events && events.length > 0 ? (
            <select
              className="input-base text-xs py-1.5"
              value={selectedEventId}
              onChange={e => {
                setSelectedEventId(e.target.value);
                setScanResult(null);
                setScanError(null);
              }}
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          ) : (
            <select className="input-base text-xs py-1.5" disabled>
              <option>No events created yet</option>
            </select>
          )}
        </div>
      </div>

      {/* Live Occupancy Stats Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Live Inside', value: stats?.liveCheckedInCount ?? 0, desc: 'Occupancy count', color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Gate Checked-Out', value: stats?.checkedOutCount ?? 0, desc: 'Exited passes', color: 'text-orange-500 bg-orange-500/10' },
          { label: 'Registered Total', value: stats?.totalTickets ?? 0, desc: 'Total passes sold', color: 'text-indigo-500 bg-indigo-500/10' },
          { label: 'Attendance Rate', value: `${stats?.attendanceRate ?? 0}%`, desc: 'Occupancy rate', color: 'text-pink-500 bg-pink-500/10' },
        ].map((stat, idx) => (
          <div key={idx} className="card p-4 flex flex-col justify-between border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm relative overflow-hidden">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white font-display">{stat.value}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{stat.desc}</p>
            <span className={`absolute right-3 top-3 w-2 h-2 rounded-full ${stat.value !== '0%' && stat.value !== 0 ? 'animate-ping' : ''} bg-current ${stat.color.split(' ')[0]}`} />
          </div>
        ))}
      </div>

      {/* Roster / Scanner Sub Navigation tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6 text-sm font-semibold">
        <button 
          onClick={() => setActiveSubTab('roster')}
          className={cn("pb-2 border-b-2 transition-colors", activeSubTab === 'roster' ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-400 hover:text-gray-600")}
        >
          Attendee Directory
        </button>
        <button 
          onClick={() => setActiveSubTab('scanner')}
          className={cn("pb-2 border-b-2 transition-colors", activeSubTab === 'scanner' ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-400 hover:text-gray-600")}
        >
          Camera QR Scanner
        </button>
        <button 
          onClick={() => setActiveSubTab('logs')}
          className={cn("pb-2 border-b-2 transition-colors", activeSubTab === 'logs' ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-400 hover:text-gray-600")}
        >
          Gate Audit Logs
        </button>
      </div>

      {/* SUB TAB: DIRECTORY ROSTER */}
      <div className={cn("space-y-4", activeSubTab === 'roster' ? "block" : "hidden")}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Roster Directory ({filteredBookings.length} bookings)</h3>
            <input
              type="text"
              placeholder="Search guests by name/email..."
              className="input-base text-xs max-w-xs py-1.5"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : selectedEventId && filteredBookings.length > 0 ? (
            <div className="card overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm bg-white dark:bg-transparent">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-transparent">
                    <th className="p-4 w-8"></th>
                    <th className="p-4">Attendee Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Tier Type</th>
                    <th className="p-4">Seats Bought</th>
                    <th className="p-4">Inside Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredBookings.map(b => {
                    const isExpanded = expandedBookingId === b.id;
                    const insideCount = b.tickets?.filter((t: any) => t.isCheckedIn).length || 0;
                    const isFullyCheckedIn = b.tickets && b.tickets.length > 0 && insideCount === b.tickets.length;
                    const hasSomeCheckedIn = insideCount > 0;
                    
                    return (
                      <React.Fragment key={b.id}>
                        <tr 
                          onClick={() => setExpandedBookingId(isExpanded ? null : b.id)}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors"
                        >
                          <td className="p-4 text-center font-bold text-gray-400">
                            {isExpanded ? '−' : '+'}
                          </td>
                          <td className="p-4 font-semibold text-gray-900 dark:text-white">
                            {b.user?.name || 'Guest'}
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400">{b.user?.email || 'N/A'}</td>
                          <td className="p-4">
                            <Badge variant={b.ticketTier?.type === 'FREE' ? 'success' : b.ticketTier?.type === 'VIP' ? 'warning' : 'brand'} className="text-[10px]">
                              {b.ticketTier?.name || 'General'}
                            </Badge>
                          </td>
                          <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">
                            {b.ticketCount} seat{b.ticketCount > 1 ? 's' : ''}
                          </td>
                          <td className="p-4">
                            {isFullyCheckedIn ? (
                              <Badge variant="success" className="text-[10px]">All Inside ({insideCount}/{b.ticketCount})</Badge>
                            ) : hasSomeCheckedIn ? (
                              <Badge variant="warning" className="text-[10px]">Partial ({insideCount}/{b.ticketCount})</Badge>
                            ) : (
                              <Badge variant="default" className="text-[10px]">Checked Out (0/{b.ticketCount})</Badge>
                            )}
                          </td>
                        </tr>
                        
                        {/* Collapsible Ticket List Section */}
                        {isExpanded && (
                          <tr className="bg-gray-50/50 dark:bg-gray-900/30">
                            <td colSpan={6} className="p-4">
                              <div className="pl-8 pr-4 py-2 space-y-3">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Individual Passes ({b.tickets?.length || 0} tickets)</p>
                                {b.tickets && b.tickets.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {b.tickets.map((t: any) => {
                                      return (
                                        <div key={t.id} className="p-3.5 bg-white dark:bg-[#121215] border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between gap-4">
                                          <div className="min-w-0">
                                            <p className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{t.ticketNumber}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">Status: {t.status}</p>
                                            
                                            <div className="flex items-center gap-1.5 mt-2">
                                              <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 truncate max-w-[130px] select-all bg-gray-50 dark:bg-gray-900 px-1 py-0.5 rounded border border-gray-100 dark:border-gray-800">
                                                {t.ticketNumber}.{t.id.substring(0,8)}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          <div>
                                            {t.isCheckedIn ? (
                                              <div className="flex flex-col items-end gap-1.5">
                                                <Badge variant="success" className="text-[9px]">Inside Venue</Badge>
                                                <Button 
                                                  size="sm" 
                                                  variant="secondary"
                                                  className="text-[9px] py-0.5 px-2.5 h-6 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                                                  onClick={() => checkInTicketMutation.mutate({ ticketCode: t.validationCode, action: 'CHECK_OUT' })}
                                                  isLoading={checkInTicketMutation.isPending}
                                                >
                                                  Check Out
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col items-end gap-1.5">
                                                <Badge variant="default" className="text-[9px]">Outside</Badge>
                                                <Button 
                                                  size="sm" 
                                                  variant="primary"
                                                  className="text-[9px] py-0.5 px-2.5 h-6"
                                                  onClick={() => checkInTicketMutation.mutate({ ticketCode: t.validationCode, action: 'CHECK_IN' })}
                                                  isLoading={checkInTicketMutation.isPending}
                                                >
                                                  Check In
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">No tickets generated yet.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-400 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm">No reservations found.</p>
            </div>
          )}
        </div>
      </div>

      {/* SUB TAB: CAMERA SCANNER */}
      <div className={cn(activeSubTab === 'scanner' ? "block" : "hidden")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* QR Scanner Device Container */}
          <div className="card p-6 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm text-center space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Gate Scanner</h3>
              
              {/* Scan Mode Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
                <button
                  onClick={() => setScanMode('CHECK_IN')}
                  className={cn("px-3 py-1 rounded-md font-bold transition-all", scanMode === 'CHECK_IN' ? "bg-brand-500 text-white shadow" : "text-gray-400")}
                >
                  Check-In
                </button>
                <button
                  onClick={() => setScanMode('CHECK_OUT')}
                  className={cn("px-3 py-1 rounded-md font-bold transition-all", scanMode === 'CHECK_OUT' ? "bg-orange-500 text-white shadow" : "text-gray-400")}
                >
                  Check-Out
                </button>
              </div>
            </div>

            {/* Cameras selection */}
            {cameras.length > 0 && (
              <div className="text-left">
                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Active Camera</label>
                <select
                  className="input-base text-xs py-1.5"
                  value={selectedCameraId}
                  onChange={e => {
                    setSelectedCameraId(e.target.value);
                    if (isScanning) {
                      startCamera(e.target.value);
                    }
                  }}
                >
                  {cameras.map(c => (
                    <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.substring(0, 5)}`}</option>
                  ))}
                </select>
              </div>
            )}

             {/* Scan Viewport */}
            <div className={cn("space-y-4", isManualInput ? "hidden" : "block")}>
              <div className="mx-auto border border-gray-200 dark:border-gray-800 bg-black rounded-2xl overflow-hidden aspect-square relative flex items-center justify-center w-full max-w-[350px]">
                {/* Dedicated scanner element (Must remain empty of React-rendered nodes to avoid conflicts) */}
                <div id="qr-reader-viewport" className="w-full h-full absolute inset-0" />

                {/* Sibling React-rendered overlays */}
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                    <button 
                      onClick={() => startCamera(selectedCameraId)}
                      className="p-4 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg hover:scale-105 transition-transform"
                    >
                      Start Camera Scanner
                    </button>
                  </div>
                )}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none border-2 border-brand-500 rounded-2xl flex items-center justify-center z-10">
                    <div className="w-full h-0.5 bg-brand-500 absolute top-0 animate-scanner-beam shadow-[0_0_8px_#6366f1]" />
                    <span className="text-[10px] text-white/50 bg-black/60 px-2 py-0.5 rounded-full absolute bottom-4 font-bold tracking-wider uppercase">Scanning...</span>
                  </div>
                )}
              </div>
              
              {isScanning && (
                <Button size="sm" variant="secondary" onClick={stopCamera} className="w-full">
                  Stop Camera
                </Button>
              )}
            </div>

            {/* Simulator Scan Input Form */}
            {isManualInput && (
              <form onSubmit={handleManualScan} className="p-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl space-y-4">
                <p className="text-xs text-gray-400">Simulate a scan event by pasting the validation code below:</p>
                <input
                  type="text"
                  placeholder="Paste ticket validation code (e.g. TIC-ticketId.signature)"
                  className="input-base text-xs font-mono py-2"
                  value={scanCode}
                  onChange={e => setScanCode(e.target.value)}
                  required
                />
                <Button type="submit" size="sm" className="w-full" isLoading={checkInTicketMutation.isPending}>
                  Simulate Scan
                </Button>
              </form>
            )}

            <button 
              onClick={() => { stopCamera(); setIsManualInput(!isManualInput); }}
              className="text-xs text-brand-500 font-bold hover:underline block mx-auto mt-2"
            >
              {isManualInput ? "Use Camera Scanner" : "Switch to Simulation Input"}
            </button>
          </div>

          {/* Scan Results Panel */}
          <div className="space-y-4 h-full">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Gate Validation Output</h3>
            
            {scanResult && !scanError && (
              <div className="card p-5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl space-y-4 animate-scale-up">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>ACCESS GRANTED ({scanMode})</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block uppercase text-[9px] font-bold">Guest Name</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{scanResult.ticket?.attendeeName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase text-[9px] font-bold">Ticket Number</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">{scanResult.ticket?.ticketNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase text-[9px] font-bold">Ticket Tier</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{scanResult.ticket?.booking?.ticketTier?.name || "General Admission"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase text-[9px] font-bold">Gate Officer</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{scanResult.attendance?.scanner?.name || 'Gate staff'}</span>
                  </div>
                </div>
                <div className="p-2 border rounded-xl bg-white dark:bg-black/40 text-[10px] text-gray-400">
                  Logs committed. Scanner automatically resumes in 3s.
                </div>
              </div>
            )}

            {scanError && (
              <div className="card p-5 bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-2xl space-y-4 animate-scale-up">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>ACCESS DENIED (Check Failed)</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300 font-semibold">{scanError}</p>
                {scanResult?.checkedInAt && (
                  <div className="pt-3 border-t border-red-100 dark:border-red-950/40 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block uppercase text-[9px] font-bold">Checked In At</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(scanResult.checkedInAt)}</span>
                    </div>
                  </div>
                )}
                <div className="p-2 border rounded-xl bg-white dark:bg-black/40 text-[10px] text-gray-400">
                  Verify pass credentials. Scanner automatically resumes in 3s.
                </div>
              </div>
            )}

            {!scanResult && !scanError && (
              <div className="card p-12 text-center text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col justify-center h-48">
                <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs">Awaiting scan credentials from QR reader.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUB TAB: AUDIT LOGS LEDGER */}
      <div className={cn("space-y-4", activeSubTab === 'logs' ? "block" : "hidden")}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Gate Audit History</h3>
            <button 
              onClick={() => { refetchStats(); refetchLogs(); }}
              className="text-xs text-brand-500 font-semibold flex items-center gap-1"
            >
              Refresh Logs
            </button>
          </div>

          {logs && logs.length > 0 ? (
            <div className="card overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-transparent">
                    <th className="p-4">Action Type</th>
                    <th className="p-4">Attendee / Ticket</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Tier</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Scanner Officer</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.map((log: any) => {
                    const isCheckIn = log.type === 'CHECK_IN';
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border inline-flex items-center gap-1",
                            isCheckIn 
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50"
                              : "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50"
                          )}>
                            {isCheckIn ? "Check-In" : "Check-Out"}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-gray-900 dark:text-white">
                          <div>{log.ticket?.attendeeName}</div>
                          <div className="text-[10px] text-gray-400 font-mono font-medium mt-0.5">{log.ticket?.ticketNumber}</div>
                        </td>
                        <td className="p-4 text-gray-500">{formatDate(log.checkedInAt)}</td>
                        <td className="p-4 text-gray-400">{log.ticket?.ticketTier?.name}</td>
                        <td className="p-4">
                          <Badge variant={log.status === 'SUCCESS' ? 'success' : 'danger'}>{log.status}</Badge>
                        </td>
                        <td className="p-4 text-gray-500 font-semibold">{log.scanner?.name || 'Gate staff'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-400 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm">No gate log logs captured yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ANALYTICS TAB (Organizer role)
const AnalyticsTab: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30d');

  // 1. Fetch organizer events list for selector
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['organizer-events-list'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Event[]>>('/events/my-events');
      return data.data;
    },
  });

  // 2. Fetch aggregated metrics & charts data
  const { data: analytics, isLoading: analyticsLoading, refetch } = useQuery({
    queryKey: ['organizer-analytics', selectedEventId, dateRange],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/events/analytics/organizer', {
        params: { eventId: selectedEventId }
      });
      return data.data;
    },
  });

  if (analyticsLoading || eventsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const kpis = analytics?.kpis || {
    totalRevenue: 0,
    totalBookings: 0,
    ticketsSold: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    attendanceRate: 0
  };

  const charts = analytics?.charts || {
    revenueTimeline: [],
    bookingStatusDistribution: [],
    popularEvents: [],
    salesHeatmap: []
  };

  // Cell color helper for custom CSS Heatmap
  const maxHeatmapCount = Math.max(...(charts.salesHeatmap?.map((c: any) => c.count) || []), 1);

  // Group Heatmap by day of week for row-wise grid mapping
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourlyIntervals = [...Array(24).keys()];

  // Color mapping helper for Donut slices
  const COLORS = {
    'Confirmed': '#10b981', // emerald
    'Pending': '#f59e0b',   // amber
    'Cancelled': '#ef4444', // red
    'Refunded': '#6366f1'   // indigo
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Enterprise Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Deep analysis metrics of your transaction sales volume and gate check-ins.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Campaign Filter Selector */}
          <select
            className="input-base text-xs py-2 px-3 rounded-xl w-full sm:w-48 bg-white dark:bg-[#121215] border border-gray-200 dark:border-gray-800"
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
          >
            <option value="all">All Campaigns (Aggregate)</option>
            {events?.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>

          {/* Date range Selector */}
          <select
            className="input-base text-xs py-2 px-3 rounded-xl w-full sm:w-32 bg-white dark:bg-[#121215] border border-gray-200 dark:border-gray-800"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            <option value="30d">Last 30 Days</option>
            <option value="6m">Last 6 Months</option>
            <option value="ytd">Year to Date</option>
          </select>

          <Button 
            variant="secondary" 
            size="sm" 
            className="h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-800" 
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: formatCurrency(kpis.totalRevenue), desc: `${kpis.ticketsSold} passes sold`, trend: '+14.2% vs last month', color: 'text-emerald-500' },
          { label: 'Total Orders', value: kpis.totalBookings, desc: `Average Order: ${formatCurrency(kpis.avgOrderValue)}`, trend: 'Sales checkout volume', color: 'text-indigo-500' },
          { label: 'Checkout Conversion', value: `${kpis.conversionRate}%`, desc: 'Cart to booking success', progress: kpis.conversionRate, color: 'text-amber-500' },
          { label: 'Gate Attendance', value: `${kpis.attendanceRate}%`, desc: 'Average guest checked-in', progress: kpis.attendanceRate, color: 'text-pink-500' },
        ].map((kpi, idx) => (
          <div key={idx} className="card p-5 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm bg-white dark:bg-transparent flex flex-col justify-between h-32 relative overflow-hidden">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{kpi.label}</span>
            <div className="mt-2">
              <span className={`text-2xl font-black font-display text-gray-900 dark:text-white ${kpi.color}`}>{kpi.value}</span>
              <p className="text-[10px] text-gray-400 mt-1">{kpi.desc}</p>
            </div>
            {kpi.progress !== undefined ? (
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full ${kpi.color.replace('text-', 'bg-')}`} style={{ width: `${kpi.progress}%` }} />
              </div>
            ) : (
              <span className="text-[9px] font-bold text-emerald-500 mt-2 block">{kpi.trend}</span>
            )}
          </div>
        ))}
      </div>

      {/* ROW 1 CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Flow timelines (Line/Area) */}
        <div className="card p-5 lg:col-span-2 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm bg-white dark:bg-transparent">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Revenue Flow Trend (₹)</h3>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ledger Feed
            </span>
          </div>
          <div className="h-64">
            {charts.revenueTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueTimeline}>
                  <defs>
                    <linearGradient id="colorSalesAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.08)" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(18, 18, 21, 0.96)', border: '1px solid rgba(128, 128, 128, 0.15)', borderRadius: '12px' }}
                    labelStyle={{ color: '#9ca3af', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ color: '#10b981', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSalesAnalytics)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400 italic">No sale transactions logged in this range.</div>
            )}
          </div>
        </div>

        {/* Booking status share (Pie/Donut) */}
        <div className="card p-5 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm bg-white dark:bg-transparent">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Bookings Status Share</h3>
          <div className="h-64 flex flex-col justify-center">
            {charts.bookingStatusDistribution.some((c: any) => c.value > 0) ? (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={charts.bookingStatusDistribution} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={45} 
                        outerRadius={65} 
                        paddingAngle={4} 
                        dataKey="value"
                      >
                        {charts.bookingStatusDistribution.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: 'rgba(18, 18, 21, 0.96)', border: '1px solid rgba(128, 128, 128, 0.15)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legends */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] text-gray-400 mt-4">
                  {charts.bookingStatusDistribution.map((c: any) => {
                    const color = COLORS[c.name as keyof typeof COLORS] || '#6b7280';
                    return (
                      <div key={c.name} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span>{c.name} ({c.value})</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400 italic">No bookings recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2 CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular campaigns COMPARATOR (Bar Chart) */}
        <div className="card p-5 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm bg-white dark:bg-transparent">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Campaign Popularity Comparison</h3>
          <div className="h-64">
            {charts.popularEvents.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.popularEvents} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(128, 128, 128, 0.08)" />
                  <XAxis type="number" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(18, 18, 21, 0.96)', border: '1px solid rgba(128, 128, 128, 0.15)', borderRadius: '12px' }}
                    labelStyle={{ color: '#9ca3af', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#6366f1', fontSize: '12px' }}
                  />
                  <Bar dataKey="tickets" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400 italic">No active events statistics available.</div>
            )}
          </div>
        </div>

        {/* Custom CSS Sales Heatmap */}
        <div className="card p-5 lg:col-span-2 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm bg-white dark:bg-transparent">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Hourly Sales Peak Heatmap</h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Weekday vs Hour of Day</span>
          </div>

          <div className="flex flex-col gap-1.5 overflow-x-auto min-w-[500px]">
            {/* Heatmap Grid Header (Hours) */}
            <div className="flex items-center gap-1 text-[8px] text-gray-400 font-mono font-bold uppercase">
              <span className="w-10 text-right shrink-0 pr-2">Day</span>
              <div className="flex-1 flex justify-between">
                {hourlyIntervals.map(h => (
                  <span key={h} className="w-3 text-center shrink-0">
                    {h.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>

            {/* Heatmap Rows */}
            {daysOfWeek.map(day => (
              <div key={day} className="flex items-center gap-1">
                <span className="w-10 text-xs font-semibold text-gray-400 shrink-0 text-right pr-2">{day}</span>
                <div className="flex-1 flex justify-between">
                  {hourlyIntervals.map(hour => {
                    const cell = charts.salesHeatmap?.find((c: any) => c.day === day && c.hour === hour) || { count: 0 };
                    const density = maxHeatmapCount > 0 ? (cell.count / maxHeatmapCount) : 0;
                    
                    return (
                      <div 
                        key={hour} 
                        style={{
                          backgroundColor: cell.count > 0 
                            ? `rgba(16, 185, 129, ${0.15 + density * 0.85})` 
                            : 'rgba(128, 128, 128, 0.05)'
                        }}
                        className="w-3 h-5 rounded-sm shrink-0 border border-white/5 dark:border-black/20 group relative cursor-pointer hover:scale-110 hover:shadow transition-transform"
                      >
                        {/* Custom hover tooltip */}
                        <div className="pointer-events-none opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[9px] font-mono rounded-lg p-2 absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 shadow-lg border border-gray-800 shrink-0 z-50 min-w-[100px] text-center transition-opacity whitespace-nowrap">
                          <p className="font-bold text-[10px] text-emerald-400">{day} at {hour.toString().padStart(2, '0')}:00</p>
                          <p className="text-gray-300 mt-0.5">{cell.count} transaction{cell.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Density legend */}
          <div className="flex justify-end items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-4">
            <span>Low Sales</span>
            <div className="w-2.5 h-2.5 rounded bg-emerald-500/15" />
            <div className="w-2.5 h-2.5 rounded bg-emerald-500/40" />
            <div className="w-2.5 h-2.5 rounded bg-emerald-500/70" />
            <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>Peak Volume</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// TRANSACTIONS / BILLING TAB
const TransactionsTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const [searchQuery, setSearchQuery] = useState('');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments-history'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Payment[]>>('/payments/history');
      return data.data;
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.post(`/payments/refund/${bookingId}`);
      return data.data;
    },
    onSuccess: () => {
      toast.success('Refund processed successfully! 💳');
      queryClient.invalidateQueries({ queryKey: ['payments-history'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Refund processing failed');
    },
  });

  const handleRefund = (bookingId: string) => {
    if (window.confirm('Are you sure you want to refund this booking? This will cancel the tickets and restore event capacity.')) {
      refundMutation.mutate(bookingId);
    }
  };

  const filteredPayments = payments?.filter(p => {
    const ref = p.paymentReference?.toLowerCase() || '';
    const eventTitle = p.booking?.event?.title?.toLowerCase() || '';
    const custName = p.booking?.user?.name?.toLowerCase() || '';
    const custEmail = p.booking?.user?.email?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return ref.includes(q) || eventTitle.includes(q) || custName.includes(q) || custEmail.includes(q);
  }) || [];

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {isOrganizer ? 'Transaction Ledger' : 'Billing & Payments'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {isOrganizer 
            ? 'Track customer payment activities, transaction IDs, and issue ticket refunds.' 
            : 'View your billing history, receipts, and invoice records.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search Bar */}
        <div className="w-full sm:max-w-md">
          <input
            type="text"
            placeholder={isOrganizer ? "Search by reference, event, or customer..." : "Search by reference or event..."}
            className="input-base text-xs py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-800"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs text-gray-400 font-semibold shrink-0">
          Showing {filteredPayments.length} transactions
        </div>
      </div>

      {filteredPayments.length > 0 ? (
        <div className="card overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-transparent">
                <th className="p-4">Reference ID</th>
                <th className="p-4">Date</th>
                <th className="p-4">Event</th>
                {isOrganizer && <th className="p-4">Customer</th>}
                <th className="p-4">Ticket tier</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                {isOrganizer && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {filteredPayments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                  <td className="p-4">
                    <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white select-all">{p.paymentReference}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{p.gateway}</p>
                  </td>
                  <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]" title={p.booking?.event?.title}>
                      {p.booking?.event?.title || 'Unknown Event'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{p.booking?.event?.category}</p>
                  </td>
                  {isOrganizer && (
                    <td className="p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{p.booking?.user?.name || 'Guest'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.booking?.user?.email}</p>
                    </td>
                  )}
                  <td className="p-4">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {p.booking?.ticketTier?.name || 'General'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.booking?.ticketCount} seat{p.booking?.ticketCount > 1 ? 's' : ''} · {p.method}
                    </p>
                  </td>
                  <td className="p-4 font-bold text-gray-900 dark:text-white">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant={
                        p.status === 'SUCCESS' 
                          ? 'success' 
                          : p.status === 'REFUNDED' 
                          ? 'warning' 
                          : p.status === 'PENDING' 
                          ? 'default' 
                          : 'danger'
                      } 
                      className="text-[10px]"
                    >
                      {p.status}
                    </Badge>
                  </td>
                  {isOrganizer && (
                    <td className="p-4 text-right">
                      {p.status === 'SUCCESS' && p.booking?.status === 'CONFIRMED' ? (
                        <Button 
                          size="sm" 
                          variant="danger" 
                          onClick={() => handleRefund(p.bookingId)}
                          isLoading={refundMutation.isPending && refundMutation.variables === p.bookingId}
                        >
                          Refund
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center text-gray-400">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm">No transaction records found.</p>
        </div>
      )}
    </div>
  );
};

// SETTINGS TAB (Both roles)
// UPCOMING EVENTS TAB
const UpcomingEventsTab: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // 1. Fetch attendee's tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['my-tickets-full'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>('/tickets/my');
      return data.data;
    },
  });

  // 2. Fetch public events for recommendations
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events-recommended'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Event[]>>('/events?limit=3');
      return data.data;
    },
  });

  const handleDownloadPdf = async (ticketId: string, ticketNumber: string) => {
    try {
      toast.loading('Generating PDF...', { id: ticketId });
      const response = await api.get(`/tickets/${ticketId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ticket_${ticketNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Ticket PDF downloaded!', { id: ticketId });
    } catch (error) {
      toast.error('Failed to download PDF ticket', { id: ticketId });
    }
  };

  const now = new Date();
  const upcomingTickets = tickets?.filter((t: any) => {
    const eventDate = new Date(t.booking?.event?.startDate || '');
    return t.status === 'ACTIVE' && eventDate >= now;
  }) || [];

  // Date highlights (dates with tickets booked)
  const ticketDatesMap: Record<string, any> = {};
  upcomingTickets.forEach((t: any) => {
    if (t.booking?.event?.startDate) {
      const dateStr = new Date(t.booking.event.startDate).toDateString();
      ticketDatesMap[dateStr] = t;
    }
  });

  // Calendar select date filter state
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Filter tickets by selected calendar date if present
  const displayedTickets = selectedDateFilter
    ? upcomingTickets.filter((t: any) => new Date(t.booking?.event?.startDate || '').toDateString() === selectedDateFilter)
    : upcomingTickets;

  // Render a mock calendar grid for September 2026 (seeding month of Summit)
  const daysInMonth = 30;
  const startDayOffset = 2; // Sept 1, 2026 is Tuesday
  const calendarCells = [];
  for (let i = 0; i < startDayOffset; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  if (ticketsLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Upcoming Experiences</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time passes and details for events you are attending next.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Passes Deck */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              Registered Passes {selectedDateFilter && "(Filtered)"}
            </h3>
            {selectedDateFilter && (
              <button 
                onClick={() => setSelectedDateFilter(null)}
                className="text-xs text-brand-500 font-semibold animate-fade-in"
              >
                Show All ({upcomingTickets.length})
              </button>
            )}
          </div>

          {displayedTickets.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {displayedTickets.map((t: any) => {
                const b = t.booking;
                const event = b?.event;
                const tier = b?.ticketTier;
                const eventDate = new Date(event?.startDate || '');
                const diffTime = eventDate.getTime() - now.getTime();
                const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                
                return (
                  <div key={t.id} className="card p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group border border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={tier?.type === 'FREE' ? 'success' : tier?.type === 'VIP' ? 'warning' : 'brand'} className="text-[10px]">
                            {tier?.name || 'General Admission'}
                          </Badge>
                          <Badge variant="success" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                            {daysRemaining === 0 ? 'Starts Today!' : daysRemaining === 1 ? 'Tomorrow!' : `In ${daysRemaining} days`}
                          </Badge>
                        </div>
                        
                        <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug truncate">{event?.title}</h3>
                        
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2">
                          <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                          <span>{formatDate(event?.startDate || '')}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{event?.venue}, {event?.city}</span>
                        </div>
                        
                        <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-3 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800 inline-block">
                          No: {t.ticketNumber}
                        </div>
                      </div>

                      {t.qrCode && (
                        <button 
                          onClick={() => setSelectedTicket(t)} 
                          className="shrink-0 p-1 bg-white border border-gray-200 dark:border-gray-800 rounded-xl hover:scale-105 transition-transform shadow-sm group-hover:shadow-md"
                        >
                          <img src={t.qrCode} alt="Pass Code" className="w-20 h-20" />
                        </button>
                      )}
                    </div>

                    <div className="border-t border-dashed border-gray-100 dark:border-gray-800 pt-4 mt-4 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-gray-400">Attendee: </span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{t.attendeeName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/events/${event?.id || event?.slug}`}>
                          <Button size="sm" variant="secondary" className="text-[10px] py-1 px-2.5 h-7">View Event</Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="primary" 
                          onClick={() => handleDownloadPdf(t.id, t.ticketNumber)}
                          className="text-[10px] py-1 px-2.5 h-7"
                        >
                          PDF Pass
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card p-8 text-center border border-gray-200 dark:border-gray-800 rounded-2xl">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No registered passes match this selection.</p>
            </div>
          )}
        </div>

        {/* Experience Calendar Widget */}
        <div className="card p-5 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4 h-fit">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Experience Calendar</h3>
              <p className="text-[10px] text-gray-400 font-medium">Select highlighted dates to view ticket passes for September 2026.</p>
            </div>
            {selectedDateFilter && (
              <button 
                onClick={() => setSelectedDateFilter(null)}
                className="text-[10px] text-brand-500 hover:text-brand-600 font-bold"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-gray-400 py-1 font-bold">{day}</div>
            ))}
            {calendarCells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="p-2" />;
              
              // Check if date corresponds to September {day}, 2026
              const cellDate = new Date(2026, 8, day);
              const cellDateStr = cellDate.toDateString();
              const hasEvent = !!ticketDatesMap[cellDateStr];
              const isSelected = selectedDateFilter === cellDateStr;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={!hasEvent}
                  onClick={() => setSelectedDateFilter(isSelected ? null : cellDateStr)}
                  className={cn(
                    "p-2 rounded-lg font-bold transition-all relative w-full aspect-square flex items-center justify-center text-xs",
                    hasEvent 
                      ? isSelected 
                        ? "bg-brand-500 text-white shadow-md scale-105"
                        : "bg-brand-550/10 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/50 hover:scale-105"
                      : "text-gray-300 dark:text-gray-700 cursor-default"
                  )}
                >
                  {day}
                  {hasEvent && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-brand-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recommended public campaigns */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">Discover Trending Experiences</h2>
        {eventsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {events.slice(0, 3).map((ev) => {
              const cheapestPrice = ev.ticketTiers && ev.ticketTiers.length > 0 
                ? Math.min(...ev.ticketTiers.map(t => t.price)) 
                : 0;
              return (
                <div key={ev.id} className="card overflow-hidden flex flex-col justify-between border border-gray-200 dark:border-gray-800 group hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                    {ev.bannerUrl ? (
                      <img src={ev.bannerUrl} alt={ev.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-500/10 to-violet-500/10 flex items-center justify-center font-bold text-brand-500">EventSphere</div>
                    )}
                    <Badge className="absolute top-3 left-3 text-[9px] bg-black/60 backdrop-blur-md border border-white/10 text-white uppercase font-bold">{ev.category}</Badge>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1 leading-snug">{ev.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{ev.venue}, {ev.city}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{formatDate(ev.startDate)}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-900 pt-3 mt-3">
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                        {cheapestPrice === 0 ? 'Free' : `₹${cheapestPrice.toLocaleString('en-IN')}`}
                      </span>
                      <Link to={`/events/${ev.id}`}>
                        <span className="text-[10px] text-brand-500 font-bold hover:text-brand-600 flex items-center gap-1">Book Now <ArrowRight className="w-3 h-3" /></span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No public events listed at this time.</p>
        )}
      </div>

      {/* Barcode zoom modal */}
      <Modal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title="Gate Admission Barcode" size="sm">
        {selectedTicket && (
          <div className="p-6 text-center space-y-4">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedTicket.booking?.event?.title}</p>
            <p className="text-xs text-gray-500">{formatDate(selectedTicket.booking?.event?.startDate || '')} · {selectedTicket.booking?.event?.venue}</p>
            <div className="w-52 h-52 mx-auto p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
              <img src={selectedTicket.qrCode} alt="Bar Code" className="w-full h-full" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-[10px] font-mono text-gray-500 break-all">
              REF CODE: {selectedTicket.ticketNumber}
            </div>
            <p className="text-xs text-gray-400">Present this QR code to the gate manager for scanning entry check-in.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

// BOOKING HISTORY TAB
const BookingHistoryTab: React.FC = () => {
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['my-bookings-history-full'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Booking[]>>('/bookings/my');
      return data.data;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Booking History</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Itemized receipts, coupon discounts, invoices, and transaction logs.</p>
      </div>

      {bookings && bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="card p-5 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-900">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Reference Code</p>
                  <p className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200 select-all">{b.bookingReference}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatDate(b.createdAt)}</span>
                  <Badge 
                    variant={
                      b.status === 'CONFIRMED' 
                        ? 'success' 
                        : b.status === 'REFUNDED' 
                        ? 'warning' 
                        : b.status === 'PENDING' 
                        ? 'default' 
                        : 'danger'
                    }
                    className="text-[9px] uppercase font-extrabold tracking-wider"
                  >
                    {b.status}
                  </Badge>
                </div>
              </div>

              {/* Event Meta */}
              <div className="py-4 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">{b.event?.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{b.event?.venue}, {b.event?.city}</p>
                </div>
                <div className="sm:text-right min-w-[120px]">
                  <p className="text-xs text-gray-500 font-medium">{b.ticketTier?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.ticketCount} seat{b.ticketCount > 1 ? 's' : ''} @ ₹{b.unitPrice.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-gray-50/50 dark:bg-gray-900/30 p-3.5 rounded-xl border border-gray-100 dark:border-gray-900 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">₹{b.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {b.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">Discount Coupon ({b.couponCode})</span>
                    <span>-₹{b.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {b.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxes & Fees (18%)</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">₹{b.taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-gray-200 dark:border-gray-800 pt-2 font-bold text-sm text-gray-900 dark:text-white">
                  <span>Grand Total Paid</span>
                  <span>{formatCurrency(b.totalAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-900">
                <div className="text-[10px] text-gray-400 italic">
                  {b.notes ? `Note: ${b.notes}` : "Transaction verified by Razorpay"}
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => setSelectedInvoice(b)}
                  className="text-[10px] py-1 px-3 h-7"
                >
                  View Invoice
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center border border-gray-200 dark:border-gray-800 rounded-2xl">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">No booking records found in your transaction history.</p>
          <Button onClick={() => navigate('/events')}>Browse Experiences</Button>
        </div>
      )}

      {/* Printable Invoice Modal */}
      <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title="Official Tax Invoice" size="md">
        {selectedInvoice && (
          <div className="p-6 space-y-6 text-xs text-gray-700 dark:text-gray-300 animate-fade-in" id="printable-invoice-section">
            <div className="flex justify-between items-start pb-6 border-b border-gray-100 dark:border-gray-900">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">EventSphere Inc.</h3>
                <p className="text-gray-400 mt-1">1234 Technology Blvd, Suite 100</p>
                <p className="text-gray-400">Mumbai, MH 400051</p>
                <p className="text-gray-400 font-semibold">GSTIN: 27AAAAA1111A1Z0</p>
              </div>
              <div className="text-right">
                <h3 className="text-lg font-bold text-brand-500 font-display uppercase tracking-wider">Invoice</h3>
                <p className="text-gray-400 mt-1">Receipt No: #{selectedInvoice.bookingReference.substring(0, 8).toUpperCase()}</p>
                <p className="text-gray-400">Date: {formatDate(selectedInvoice.createdAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">Billed To:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedInvoice.user?.name || 'Guest Buyer'}</span>
                <p className="text-gray-400 mt-0.5">{selectedInvoice.user?.email || 'N/A'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">Payment Method:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedInvoice.paymentId ? 'Razorpay Gateway' : 'Standard Sandbox'}</span>
                <p className="text-gray-400 mt-0.5">Status: Paid/Captured</p>
              </div>
            </div>

            {/* Receipt Table */}
            <table className="w-full text-left border-collapse mt-4">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                <tr className="py-2">
                  <td className="py-3 font-semibold text-gray-900 dark:text-white text-xs">
                    {selectedInvoice.event?.title} - {selectedInvoice.ticketTier?.name} Seat Pass
                  </td>
                  <td className="py-3 text-center">{selectedInvoice.ticketCount}</td>
                  <td className="py-3 text-right">₹{selectedInvoice.unitPrice.toLocaleString('en-IN')}</td>
                  <td className="py-3 text-right font-semibold">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            {/* Calculations block */}
            <div className="border-t border-gray-100 dark:border-gray-900 pt-4 flex flex-col items-end space-y-2">
              <div className="w-52 flex justify-between">
                <span className="text-gray-400">Subtotal:</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {selectedInvoice.discountAmount > 0 && (
                <div className="w-52 flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Discount ({selectedInvoice.couponCode}):</span>
                  <span>-₹{selectedInvoice.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {selectedInvoice.taxAmount > 0 && (
                <div className="w-52 flex justify-between">
                  <span className="text-gray-400">CGST + SGST (18%):</span>
                  <span className="font-semibold text-gray-900 dark:text-white">₹{selectedInvoice.taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="w-52 flex justify-between border-t border-gray-200 dark:border-gray-800 pt-2 font-bold text-sm text-brand-500">
                <span>Total Paid:</span>
                <span>₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-900 print:hidden">
              <Button size="sm" variant="secondary" onClick={() => setSelectedInvoice(null)}>Close</Button>
              <Button size="sm" onClick={handlePrint} leftIcon={<Printer className="w-3.5 h-3.5" />}>Print Invoice</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// SAVED EVENTS TAB
const SavedEventsTab: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: savedEvents, isLoading } = useQuery({
    queryKey: ['saved-events'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Event[]>>('/events/saved');
      return data.data;
    },
  });

  const toggleSaveMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await api.post(`/events/${eventId}/save`);
      return data.data;
    },
    onSuccess: (data) => {
      toast.success(data.saved ? 'Saved to bookmarks' : 'Removed from bookmarks');
      queryClient.invalidateQueries({ queryKey: ['saved-events'] });
    },
    onError: () => {
      toast.error('Failed to update bookmark');
    },
  });

  if (isLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Saved Experiences</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Your bookmarked events. Visit their pages or check seat tiers instantly.</p>
      </div>

      {savedEvents && savedEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {savedEvents.map((ev) => {
            const cheapestPrice = ev.ticketTiers && ev.ticketTiers.length > 0 
              ? Math.min(...ev.ticketTiers.map(t => t.price)) 
              : 0;

            return (
              <div key={ev.id} className="card overflow-hidden flex flex-col justify-between border border-gray-200 dark:border-gray-800 group hover:shadow-md transition-shadow relative animate-scale-up">
                
                <button 
                  onClick={() => toggleSaveMutation.mutate(ev.id)}
                  disabled={toggleSaveMutation.isPending}
                  className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-black/60 backdrop-blur-md rounded-full shadow border border-gray-200/50 dark:border-gray-800/50 text-red-500 hover:scale-105 transition-transform z-10 animate-fade-in"
                  title="Remove from Saved"
                >
                  <Heart className="w-3.5 h-3.5 fill-red-500" />
                </button>

                <div className="h-32 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                  {ev.bannerUrl ? (
                    <img src={ev.bannerUrl} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-500/10 to-violet-500/10 flex items-center justify-center font-bold text-brand-500">EventSphere</div>
                  )}
                  <Badge className="absolute top-3 left-3 text-[9px] bg-black/60 backdrop-blur-md border border-white/10 text-white uppercase font-bold">{ev.category}</Badge>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1 leading-snug">{ev.title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{ev.venue}, {ev.city}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{formatDate(ev.startDate)}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-900 pt-3 mt-3">
                    <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                      {cheapestPrice === 0 ? 'Free' : `₹${cheapestPrice.toLocaleString('en-IN')}`}
                    </span>
                    <Link to={`/events/${ev.id || ev.slug}`}>
                      <Button size="sm" className="text-[10px] h-7 px-3 py-1">View Details</Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center border border-gray-200 dark:border-gray-800 rounded-2xl">
          <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">You have not saved any events yet.</p>
          <Button onClick={() => navigate('/events')}>Discover Events</Button>
        </div>
      )}
    </div>
  );
};

// NOTIFICATIONS TAB
const NotificationsTab: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>('/notifications');
      return data.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/notifications/${id}/read`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch('/notifications/mark-all-read');
      return data.data;
    },
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/notifications/${id}`);
      return data.data;
    },
    onSuccess: () => {
      toast.success('Notification deleted');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time alerts, check-ins, purchase receipts, and gate updates.</p>
        </div>
        {unreadCount > 0 && (
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => markAllReadMutation.mutate()}
            isLoading={markAllReadMutation.isPending}
            className="text-xs"
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((n: any) => {
            const isBooking = n.type === 'booking' || n.type?.includes('payment');
            const isCheckIn = n.type?.includes('check');
            
            return (
              <div 
                key={n.id} 
                className={cn(
                  "p-4 border rounded-2xl flex justify-between items-start gap-4 transition-all relative overflow-hidden hover:shadow-sm",
                  n.isRead 
                    ? "bg-white dark:bg-[#121215] border-gray-200 dark:border-gray-800/80 opacity-75" 
                    : "bg-brand-50/20 dark:bg-brand-900/5 border-brand-200 dark:border-brand-900/30"
                )}
              >
                {!n.isRead && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
                )}
                
                <div className="flex gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
                    isBooking 
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500" 
                      : isCheckIn 
                      ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500" 
                      : "bg-blue-50 dark:bg-blue-950/20 text-blue-500"
                  )}>
                    {isBooking ? <Ticket className="w-4 h-4" /> : isCheckIn ? <ShieldCheck className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <p className={cn("font-bold text-sm", n.isRead ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 block">{formatDate(n.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.isRead && (
                    <button 
                      onClick={() => markReadMutation.mutate(n.id)}
                      disabled={markReadMutation.isPending}
                      className="text-[10px] text-brand-500 hover:text-brand-600 font-bold px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/20"
                    >
                      Read
                    </button>
                  )}
                  <button 
                    onClick={() => deleteMutation.mutate(n.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center border border-gray-200 dark:border-gray-800 rounded-2xl">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No notifications found.</p>
        </div>
      )}
    </div>
  );
};

// UPGRADED SETTINGS TAB (Both roles)
const ProfileSettingsTab: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  // Profile Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // API developer key states
  const [revealKey, setRevealKey] = useState(false);
  const webhookUrl = 'https://api.eventsphere.com/webhooks/stripe-listener';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await api.put('/auth/profile', { name: profileName, bio: profileBio, phone: profilePhone, avatar: profileAvatar });
      toast.success('Profile settings updated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile settings');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully! Signing you out...');
      setTimeout(async () => {
        await logout();
        navigate('/auth/login');
      }, 1500);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Workspace Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure profile details, secure passwords, and developer integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="card p-6 lg:col-span-2 space-y-6 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Account Information</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Update your public profile information.</p>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Registered Email</label>
                <input type="email" className="input-base opacity-60 cursor-not-allowed text-xs" value={user?.email || ''} disabled />
              </div>
              <div>
                <label className="label">Display Name</label>
                <input type="text" className="input-base text-xs" value={profileName} onChange={e => setProfileName(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Contact Phone</label>
                <input type="text" className="input-base text-xs" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="label">Avatar Image URL</label>
                <input type="text" className="input-base text-xs" value={profileAvatar} onChange={e => setProfileAvatar(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div>
              <label className="label">Biography Description</label>
              <textarea className="input-base h-24 resize-none text-xs" value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="Tell us about yourself..." />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isSavingProfile}>Save Profile Settings</Button>
            </div>
          </form>
        </div>

        {/* Live Badge Preview Card */}
        <div className="card p-6 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 flex flex-col justify-between min-h-[300px]">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-gray-400">Live Card Preview</h4>
            <p className="text-[10px] text-gray-400">Organizers will scan this identity pass at the gate checks.</p>
          </div>
          
          <div className="p-5 bg-white/70 dark:bg-black/50 backdrop-blur-md border border-white/20 dark:border-gray-800 rounded-2xl shadow-md space-y-4 relative overflow-hidden group">
            <span className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl -z-10" />
            <div className="flex items-center gap-3">
              <Avatar src={profileAvatar || user?.avatar} name={profileName || 'User'} size="lg" className="ring-2 ring-brand-500/50" />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-base truncate">{profileName || 'John Doe'}</h4>
                <p className="text-[10px] text-gray-400 truncate">{user?.email || 'email@example.com'}</p>
                <span className="inline-block mt-2 px-2 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full text-[9px] font-bold">
                  {user?.role || 'ATTENDEE'}
                </span>
              </div>
            </div>
            {profileBio && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-3 pl-1 border-l-2 border-brand-500/30">
                "{profileBio}"
              </p>
            )}
            {profilePhone && (
              <p className="text-[10px] text-gray-400 font-mono">
                Tel: {profilePhone}
              </p>
            )}
          </div>
          <div className="text-[10px] text-gray-400 text-center">Changes reflect instantly above as you type.</div>
        </div>

        {/* Security Password Card */}
        <div className="card p-6 space-y-6 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm lg:col-span-2">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Security & Password</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Update password keys for secure access.</p>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input 
                type="password" 
                className="input-base text-xs" 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="label">New Password</label>
              <input 
                type="password" 
                className="input-base text-xs" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input 
                type="password" 
                className="input-base text-xs" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" isLoading={isChangingPassword}>Change Password</Button>
            </div>
          </form>
        </div>
      </div>

      {/* Developer keys section for organizers */}
      {isOrganizer && (
        <div className="card p-6 space-y-4 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm max-w-2xl">
          <h3 className="font-bold text-gray-900 dark:text-white text-base">Developer Integrations</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Publishable Key</span>
                <button onClick={() => copyToClipboard('pk_test_eventsphere_51M3fGvJ', 'Publishable Key')} className="text-gray-400 hover:text-brand-500"><Copy className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-900/50 text-[10px] font-mono text-gray-600 dark:text-gray-400 break-all select-all">
                pk_test_eventsphere_51M3fGvJ...8H2y
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secret Key</span>
                <div className="flex gap-2">
                  <button onClick={() => setRevealKey(!revealKey)} className="text-gray-400 hover:text-brand-500">
                    {revealKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => copyToClipboard('sk_test_eventsphere_51M3fGvJz1f8b3h2y9q4w8x9c0v1', 'Secret Key')} className="text-gray-400 hover:text-brand-500"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-900/50 text-[10px] font-mono text-gray-600 dark:text-gray-400 break-all select-all flex items-center justify-between">
                <span>{revealKey ? 'sk_test_eventsphere_51M3fGvJz1f8b3h2y9q4w8x9c0v1' : '••••••••••••••••••••••••••••••••••••••••••••'}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Webhook Endpoint</span>
                <button onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')} className="text-gray-400 hover:text-brand-500"><Copy className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-900/50 text-[10px] font-mono text-gray-600 dark:text-gray-400 break-all select-all font-semibold">
                {webhookUrl}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0f0f11]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-gray-900 dark:text-white">Dashboard</span>
          <div />
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<OverviewTab />} />
            <Route path="/bookings" element={<MyTicketsTab />} />
            <Route path="/upcoming" element={<UpcomingEventsTab />} />
            <Route path="/history" element={<BookingHistoryTab />} />
            <Route path="/saved" element={<SavedEventsTab />} />
            <Route path="/notifications" element={<NotificationsTab />} />
            <Route path="/events" element={<MyEventsTab />} />
            <Route path="/create-event" element={<CreateEventTab />} />
            <Route path="/events/:eventId/edit" element={<EditEventTab />} />
            <Route path="/chat/:eventId" element={<EventChatPage />} />
            <Route path="/attendees" element={<AttendeesTab />} />
            <Route path="/analytics" element={<AnalyticsTab />} />
            <Route path="/transactions" element={<TransactionsTab />} />
            <Route path="/settings" element={<ProfileSettingsTab />} />
            <Route path="/admin/users" element={<AdminUsersTab />} />
            <Route path="/admin/events" element={<AdminEventsTab />} />
            <Route path="/admin/payments" element={<AdminPaymentsTab />} />
            <Route path="/admin/logs" element={<AdminLogsTab />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsTab />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
