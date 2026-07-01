import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, ArrowLeft, ArrowRight, Check,
  AlertCircle, Tag, Percent, ShieldCheck, Ticket,
  CreditCard, Smartphone
} from 'lucide-react';
import { api } from '../lib/axios';
import { Event, TicketTier, Booking, ApiResponse } from '../types';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency, getCategoryIcon, TICKET_TYPE_COLORS } from '../lib/utils';
import toast from 'react-hot-toast';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  isActive: boolean;
}

const STEPS = [
  { id: 1, label: 'Select Tickets' },
  { id: 2, label: 'Attendee Details' },
  { id: 3, label: 'Review summary' },
  { id: 4, label: 'Payment Details' },
  { id: 5, label: 'Confirmation' },
];

export const BookingPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  const queryTierId = searchParams.get('tier');
  const queryQuantity = parseInt(searchParams.get('quantity') || '1', 10);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const [step, setStep] = useState(1);

  // Selection states
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [ticketCount, setTicketCount] = useState(1);

  // Attendee info states
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [attendeeErrors, setAttendeeErrors] = useState<Record<string, string>>({});

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('upi');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  // Final confirmation booking data
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Confetti particles for success step
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string; delay: number; size: number }>>([]);

  // Fetch Event Details
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Event>>(`/events/${eventId}`);
      return data.data;
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Session expired. Please sign in to book tickets.');
      navigate(`/auth/login?redirect=/checkout/${eventId}`);
    }
  }, [isAuthenticated, navigate, eventId]);

  // Set default tier and quantity from query parameters or fetched event details
  useEffect(() => {
    if (event) {
      if (queryTierId) {
        const matchingTier = event.ticketTiers.find(t => t.id === queryTierId && t.isActive);
        if (matchingTier) {
          setSelectedTier(matchingTier);
        } else {
          setSelectedTier(event.ticketTiers.find(t => t.isActive) || event.ticketTiers[0]);
        }
      } else if (event.ticketTiers.length > 0) {
        setSelectedTier(event.ticketTiers.find(t => t.isActive) || event.ticketTiers[0]);
      }
      setTicketCount(Math.max(1, Math.min(10, queryQuantity)));
    }
  }, [event, queryTierId, queryQuantity]);

  // Populate attendee info from authenticated user state
  useEffect(() => {
    if (user) {
      setAttendeeName(user.name || '');
      setAttendeeEmail(user.email || '');
      setAttendeePhone(user.phone || '');
    }
  }, [user]);

  // Setup CSS confetti on confirmation screen
  useEffect(() => {
    if (step === 5) {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
      const particles = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        size: Math.random() * 8 + 6,
      }));
      setConfetti(particles);
    }
  }, [step]);

  // Form input formatting helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const formatted = val.match(/.{1,4}/g)?.join(' ') || '';
    setCardNumber(formatted.substring(0, 19));
    if (paymentErrors.cardNumber) setPaymentErrors(prev => ({ ...prev, cardNumber: '' }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setCardExpiry(val.substring(0, 5));
    if (paymentErrors.cardExpiry) setPaymentErrors(prev => ({ ...prev, cardExpiry: '' }));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCardCvv(val.substring(0, 4));
    if (paymentErrors.cardCvv) setPaymentErrors(prev => ({ ...prev, cardCvv: '' }));
  };

  // Pricing calculations
  const unitPrice = selectedTier?.price || 0;
  const subtotal = unitPrice * ticketCount;

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discount = Math.min(appliedCoupon.discountValue, subtotal);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const gstTax = taxableAmount * 0.18; // 18% GST tax rate
  const grandTotal = taxableAmount + gstTax;

  // Coupon Verification API call
  const verifyCouponMutation = useMutation({
    mutationFn: async (payload: { code: string; amount: number }) => {
      const { data } = await api.post<ApiResponse<Coupon>>('/bookings/coupons/validate', payload);
      return data.data;
    },
    onSuccess: (data) => {
      setAppliedCoupon(data);
      setCouponSuccessMsg(`Successfully applied: ${data.discountType === 'percentage' ? `${data.discountValue}% off` : `₹${data.discountValue} off`}`);
      toast.success('Coupon applied successfully! 🏷️');
    },
    onError: (err: any) => {
      setAppliedCoupon(null);
      const msg = err?.response?.data?.message || 'Invalid or expired coupon code';
      toast.error(msg);
    },
  });

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    verifyCouponMutation.mutate({
      code: couponCode.trim(),
      amount: subtotal,
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccessMsg('');
    toast.success('Coupon removed');
  };

  // Booking and Checkout Logic
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<Booking>>('/bookings', {
        eventId: event!.id,
        ticketTierId: selectedTier!.id,
        ticketCount,
        couponCode: appliedCoupon?.code || undefined,
      });
      return data.data;
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (payload: {
      bookingId: string;
      paymentId: string;
      paymentOrderId: string;
      paymentSignature: string;
    }) => {
      const { data } = await api.post<ApiResponse<Booking>>('/bookings/confirm-payment', payload);
      return data.data;
    },
    onSuccess: (data) => {
      setConfirmedBooking(data);
      toast.success('Pass booked successfully! 🚀');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setStep(5);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Checkout payment failed';
      toast.error(msg);
    },
  });

  // Step Validation & Navigation
  const validateStep = (): boolean => {
    if (step === 1) {
      if (!selectedTier) {
        toast.error('Please select a ticket tier');
        return false;
      }
      if (selectedTier.quantity - selectedTier.sold < ticketCount) {
        toast.error('Selected ticket count exceeds seats remaining');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const errs: Record<string, string> = {};
      if (!attendeeName.trim()) errs.name = 'Full name is required';
      if (!attendeeEmail.trim()) {
        errs.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail.trim())) {
        errs.email = 'Please enter a valid email address';
      }
      if (!attendeePhone.trim()) {
        errs.phone = 'Phone number is required';
      } else if (!/^\+?[0-9\s-]{10,15}$/.test(attendeePhone.trim())) {
        errs.phone = 'Please enter a valid phone number (10-15 digits)';
      }
      setAttendeeErrors(errs);
      return Object.keys(errs).length === 0;
    }

    if (step === 3) {
      return true;
    }

    if (step === 4) {
      // Payment details validation
      const errs: Record<string, string> = {};
      if (selectedTier?.price === 0) return true; // skip validation for free tickets

      if (paymentMethod === 'upi') {
        // UPI validation
        const upiTrimmed = upiId.trim();
        if (!upiTrimmed) {
          errs.upiId = 'UPI ID is required';
        } else if (!/^[\w.\-]+@[\w.\-]+$/.test(upiTrimmed)) {
          errs.upiId = 'Enter a valid UPI ID (e.g., name@upi, phone@paytm)';
        }
      } else {
        // Card validation
        if (!cardName.trim()) errs.cardName = 'Cardholder name is required';

        const rawCard = cardNumber.replace(/\s+/g, '');
        if (rawCard.length < 15 || rawCard.length > 16) {
          errs.cardNumber = 'Card number must be 15 or 16 digits';
        }

        if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
          errs.cardExpiry = 'Use MM/YY format';
        } else {
          const [month, year] = cardExpiry.split('/').map(Number);
          const currentYear = new Date().getFullYear() % 100;
          const currentMonth = new Date().getMonth() + 1;
          if (month < 1 || month > 12) {
            errs.cardExpiry = 'Invalid month';
          } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
            errs.cardExpiry = 'Card has expired';
          }
        }

        if (cardCvv.length < 3 || cardCvv.length > 4) {
          errs.cardCvv = 'CVV must be 3 or 4 digits';
        }
      }

      setPaymentErrors(errs);
      return Object.keys(errs).length === 0;
    }

    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === 4) {
      // Process final checkout payment
      try {
        const booking = await createBookingMutation.mutateAsync();
        
        if (booking.status === 'CONFIRMED') {
          // Free ticket confirmed immediately without payment
          setConfirmedBooking(booking);
          toast.success('Pass booked successfully! 🚀');
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
          setStep(5);
        } else if (!booking.paymentOrderId || booking.paymentOrderId.startsWith('order_mock_') || !(window as any).Razorpay) {
          // Sandbox Fallback
          toast.success('Processing sandbox payment...');
          await confirmPaymentMutation.mutateAsync({
            bookingId: booking.id,
            paymentId: 'pay_mock_' + Math.random().toString(36).substring(2, 10),
            paymentOrderId: booking.paymentOrderId || 'order_mock_' + Math.random().toString(36).substring(2, 10),
            paymentSignature: 'sig_mock_' + Math.random().toString(36).substring(2, 15),
          });
        } else {
          // Open Razorpay Widget
          const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummyKeyId',
            amount: Math.round(booking.totalAmount * 100),
            currency: 'INR',
            name: 'EventSphere',
            description: `Pass for ${event?.title || 'Event'}`,
            order_id: booking.paymentOrderId,
            handler: async (response: any) => {
              try {
                await confirmPaymentMutation.mutateAsync({
                  bookingId: booking.id,
                  paymentId: response.razorpay_payment_id,
                  paymentOrderId: response.razorpay_order_id,
                  paymentSignature: response.razorpay_signature,
                });
              } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Payment confirmation failed');
              }
            },
            prefill: {
              name: attendeeName,
              email: attendeeEmail,
              contact: attendeePhone,
            },
            theme: {
              color: '#6366f1',
            },
            modal: {
              ondismiss: () => {
                toast.error('Payment cancelled');
              }
            }
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Booking process failed. Please try again.');
      }
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step === 5) {
      navigate('/dashboard/bookings');
    } else {
      setStep(prev => Math.max(1, prev - 1));
    }
  };

  if (eventLoading) {
    return (
      <PageWrapper>
        <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Fetching event checkout ledger...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!event) {
    return (
      <PageWrapper>
        <div className="text-center py-32 max-w-6xl mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Event checkout unavailable</h2>
          <p className="text-gray-400 mb-6">The experience you are trying to book cannot be resolved.</p>
          <Button onClick={() => navigate('/events')}>Browse Experiences</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* CSS Confetti keyframes styling inserted directly */}
      {step === 5 && (
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes confetti-fall {
            0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
          .confetti-particle {
            position: fixed;
            top: -20px;
            pointer-events: none;
            z-index: 100;
            animation: confetti-fall 3.5s linear forwards;
          }
        ` }} />
      )}

      {/* Confetti rendering */}
      {step === 5 && confetti.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            borderRadius: '2px',
          }}
        />
      ))}

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Animated Stepper Header */}
        <div className="card p-5 mb-8">
          <div className="flex justify-between items-center relative max-w-xl mx-auto">
            {/* Connection background line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 z-0" />
            
            {/* Active connection progress line */}
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-brand-500 -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map(s => {
              const isCompleted = step > s.id;
              const isActive = step === s.id;
              return (
                <div key={s.id} className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => s.id < step && s.id !== 5 && setStep(s.id)}
                    disabled={s.id >= step || step === 5}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-xs transition-all duration-200',
                      isCompleted ? 'bg-brand-500 border-brand-500 text-white' :
                      isActive ? 'bg-white dark:bg-gray-900 border-brand-500 text-brand-500 shadow-md ring-4 ring-brand-500/20' :
                      'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                  </button>
                  <span className={cn('text-[10px] font-bold mt-2 hidden sm:block',
                    isActive ? 'text-brand-500 font-extrabold' : 'text-gray-400'
                  )}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Checkout Split Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Area: Wizard step panel */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="card p-6 min-h-[400px] flex flex-col justify-between"
              >
                {/* STEP 1: Select tickets */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">Admission Tier</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Choose your ticket tier and select the quantity you wish to purchase.</p>
                    </div>

                    <div className="space-y-3">
                      {event.ticketTiers.map(tier => {
                        const isSelected = selectedTier?.id === tier.id;
                        const availableCount = tier.quantity - tier.sold;
                        const isTierSoldOut = availableCount <= 0 || !tier.isActive;

                        return (
                          <button
                            type="button"
                            key={tier.id}
                            disabled={isTierSoldOut}
                            onClick={() => setSelectedTier(tier)}
                            className={cn(
                              'w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center',
                              isTierSoldOut ? 'opacity-50 cursor-not-allowed bg-gray-50/50 dark:bg-transparent border-gray-200 dark:border-gray-800' :
                              isSelected ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-900/10 shadow-sm ring-1 ring-brand-500/20' :
                              'border-gray-200 dark:border-gray-800 hover:border-brand-300'
                            )}
                          >
                            <div className="min-w-0 pr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-950 dark:text-white text-sm">{tier.name}</span>
                                <Badge className={cn('text-[9px] py-0.5', TICKET_TYPE_COLORS[tier.type])}>{tier.type}</Badge>
                              </div>
                              {tier.description && <p className="text-xs text-gray-500 dark:text-gray-400">{tier.description}</p>}
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                                {tier.perks?.slice(0, 3).map(perk => (
                                  <span key={perk} className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                    ✓ {perk}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-black text-brand-500 block">{formatCurrency(tier.price)}</span>
                              <span className={cn('text-[10px] mt-1 block font-semibold',
                                isTierSoldOut ? 'text-red-500' :
                                availableCount < 10 ? 'text-amber-500' : 'text-gray-400'
                              )}>
                                {isTierSoldOut ? 'Sold Out' : `${availableCount} tickets left`}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedTier && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div>
                          <p className="text-xs text-gray-900 dark:text-white font-semibold">Select Quantity</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Maximum 10 tickets per booking request.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                            className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-black text-gray-950 dark:text-white text-base">
                            {ticketCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setTicketCount(Math.min(10, selectedTier.quantity - selectedTier.sold, ticketCount + 1))}
                            className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: Attendee Info */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">Attendee Details</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Enter the credentials where your tickets passes will be registered and delivered.</p>
                    </div>

                    <div className="space-y-4">
                      <Input
                        label="Full Display Name *"
                        placeholder="Ex. Alex Kumar"
                        value={attendeeName}
                        onChange={e => { setAttendeeName(e.target.value); if (attendeeErrors.name) setAttendeeErrors(prev => ({ ...prev, name: '' })); }}
                        error={attendeeErrors.name}
                      />

                      <Input
                        label="Email Address *"
                        type="email"
                        placeholder="Ex. alex.kumar@gmail.com"
                        value={attendeeEmail}
                        onChange={e => { setAttendeeEmail(e.target.value); if (attendeeErrors.email) setAttendeeErrors(prev => ({ ...prev, email: '' })); }}
                        error={attendeeErrors.email}
                        helperText="Your QR codes entry pass will be generated and sent to this email address."
                      />

                      <Input
                        label="Contact Phone Number *"
                        type="tel"
                        placeholder="Ex. 9876543210"
                        value={attendeePhone}
                        onChange={e => { setAttendeePhone(e.target.value); if (attendeeErrors.phone) setAttendeeErrors(prev => ({ ...prev, phone: '' })); }}
                        error={attendeeErrors.phone}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: Review Invoice */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">Review Invoice Summary</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Review your itemized invoice breakdown and apply coupons discount.</p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-2xl space-y-3.5 text-xs">
                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 pb-2.5 border-b border-gray-200/50 dark:border-gray-800/50">
                        <span className="font-semibold text-gray-900 dark:text-white">Item description</span>
                        <span>Total Rate</span>
                      </div>
                      
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{event.title}</p>
                          <p className="text-gray-400 text-[10px] mt-0.5">Tier: {selectedTier?.name} · Qty: {ticketCount}</p>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white shrink-0">{formatCurrency(subtotal)}</span>
                      </div>

                      {appliedCoupon && (
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Coupon Discount ({appliedCoupon.code})</span>
                          <span>− {formatCurrency(discount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                        <span>Taxable Amount</span>
                        <span>{formatCurrency(subtotal - discount)}</span>
                      </div>

                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                        <span>Goods & Services Tax (18% GST)</span>
                        <span>{formatCurrency(gstTax)}</span>
                      </div>

                      <div className="h-px bg-gray-200 dark:bg-gray-800 my-1" />

                      <div className="flex justify-between items-center font-black text-gray-950 dark:text-white text-sm">
                        <span>Grand Total Due</span>
                        <span className="text-brand-500">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>

                    {/* Coupon Apply Form */}
                    {!appliedCoupon ? (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Coupon code (e.g. SPHERE20, EARLYBIRD)"
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value)}
                            className="text-xs uppercase animate-none"
                            disabled={verifyCouponMutation.isPending}
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="secondary"
                          className="shrink-0 h-[42px] mt-auto"
                          isLoading={verifyCouponMutation.isPending}
                          disabled={!couponCode.trim()}
                        >
                          Apply Code
                        </Button>
                      </form>
                    ) : (
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-xs">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-medium">
                          <Tag className="w-4 h-4 text-emerald-500" />
                          <span>{couponSuccessMsg}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-red-500 hover:text-red-600 font-bold underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: Checkout */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">Payment Checkout</h2>
                      {selectedTier?.price === 0 ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">This ticket is free. Click complete checkout to confirm reservation immediately.</p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5 font-medium">Choose your preferred payment method below to complete checkout.</p>
                      )}
                    </div>

                    {selectedTier && selectedTier.price > 0 && (
                      (() => {
                        const isSandbox = (import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummyKeyId').includes('dummyKeyId');
                        return isSandbox ? (
                          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-[11px] leading-relaxed">
                            ⚠️ <strong>Sandbox Mock Mode</strong>: Actual payments are simulated in local development. You can enter any mock cards or mock UPI address details below to proceed.
                          </div>
                        ) : (
                          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[11px] leading-relaxed">
                            🔒 <strong>Secure Payment Gateway</strong>: Real billing details will be collected and processed securely inside the official Razorpay merchant checkout window.
                          </div>
                        );
                      })()
                    )}

                    {selectedTier?.price === 0 ? (
                      <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/30 border border-dashed rounded-3xl space-y-3">
                        <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Free Ticket Admission</h4>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">No billing transaction details required. Simply click the Complete Checkout button to authorize booking references.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Payment Method Selector */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => { setPaymentMethod('upi'); setPaymentErrors({}); }}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 ${
                              paymentMethod === 'upi'
                                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20 shadow-sm'
                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              paymentMethod === 'upi' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className={`text-sm font-bold ${paymentMethod === 'upi' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>UPI</p>
                              <p className="text-[10px] text-gray-400">GPay, PhonePe, Paytm</p>
                            </div>
                          </button>

                          <button
                            onClick={() => { setPaymentMethod('card'); setPaymentErrors({}); }}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 ${
                              paymentMethod === 'card'
                                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20 shadow-sm'
                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              paymentMethod === 'card' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className={`text-sm font-bold ${paymentMethod === 'card' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>Card</p>
                              <p className="text-[10px] text-gray-400">Visa, MasterCard, RuPay</p>
                            </div>
                          </button>
                        </div>

                        {/* UPI Payment Form */}
                        {paymentMethod === 'upi' && (
                          <div className="space-y-4">
                            {/* UPI Graphic */}
                            <div className="h-44 rounded-3xl bg-gradient-to-br from-violet-950 to-indigo-950 p-6 text-white flex flex-col justify-between shadow-xl relative overflow-hidden border border-violet-800/50">
                              <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl" />
                              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                              <div className="flex justify-between items-start relative z-10">
                                <div>
                                  <p className="text-[8px] font-bold uppercase tracking-wider text-violet-400">UPI Payment</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold">G</div>
                                    <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold">P</div>
                                    <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold">₹</div>
                                  </div>
                                </div>
                                <span className="font-display font-extrabold text-sm tracking-tight text-violet-400">EventSphere Pay</span>
                              </div>
                              <div className="space-y-1 relative z-10">
                                <p className="text-[6px] uppercase tracking-wider text-violet-400 font-bold">UPI Virtual Payment Address</p>
                                <p className="font-mono text-base tracking-wide text-violet-100 min-h-[24px]">
                                  {upiId || 'yourname@upi'}
                                </p>
                              </div>
                            </div>

                            {/* UPI ID Input */}
                            <Input
                              label="UPI ID / VPA *"
                              placeholder="e.g., 9876543210@paytm, name@oksbi"
                              value={upiId}
                              onChange={e => { setUpiId(e.target.value); if (paymentErrors.upiId) setPaymentErrors(prev => ({ ...prev, upiId: '' })); }}
                              error={paymentErrors.upiId}
                            />

                            <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/50">
                              <ShieldCheck className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-violet-700 dark:text-violet-300">
                                A collect request will be sent to your UPI app. Approve it within 5 minutes to confirm your booking. Supported apps: Google Pay, PhonePe, Paytm, BHIM, and all UPI-linked bank apps.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Card Payment Form */}
                        {paymentMethod === 'card' && (
                          <div className="space-y-4">
                            {/* Mock Credit Card Graphics Component */}
                            <div className="h-44 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white flex flex-col justify-between shadow-xl relative overflow-hidden border border-slate-800">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Credit Card Pass</p>
                                  <div className="w-8 h-6 bg-yellow-500/80 rounded-md mt-2 flex items-center justify-center shadow-xs border border-yellow-400/20" />
                                </div>
                                <span className="font-display font-extrabold text-sm tracking-tight text-indigo-400">EventSphere Pay</span>
                              </div>

                              <div className="space-y-3">
                                <p className="font-mono text-base tracking-widest text-slate-100 min-h-[24px]">
                                  {cardNumber || '•••• •••• •••• ••••'}
                                </p>
                                <div className="flex justify-between items-end">
                                  <div>
                                    <p className="text-[6px] uppercase tracking-wider text-slate-400 font-bold">Card Holder</p>
                                    <p className="font-mono text-xs uppercase tracking-wide text-slate-200 min-h-[16px] truncate max-w-[180px]">
                                      {cardName || 'YOUR FULL NAME'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[6px] uppercase tracking-wider text-slate-400 font-bold">Expires</p>
                                    <p className="font-mono text-xs text-slate-200 min-h-[16px]">
                                      {cardExpiry || 'MM/YY'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Credit Card Inputs Form */}
                            <div className="space-y-3">
                              <Input
                                label="Cardholder Full Name *"
                                placeholder="Name as it appears on card"
                                value={cardName}
                                onChange={e => { setCardName(e.target.value); if (paymentErrors.cardName) setPaymentErrors(prev => ({ ...prev, cardName: '' })); }}
                                error={paymentErrors.cardName}
                              />

                              <Input
                                label="Card Number *"
                                placeholder="4000 1234 5678 9010"
                                value={cardNumber}
                                onChange={handleCardNumberChange}
                                error={paymentErrors.cardNumber}
                              />

                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  label="Expiration Date *"
                                  placeholder="MM/YY"
                                  value={cardExpiry}
                                  onChange={handleExpiryChange}
                                  error={paymentErrors.cardExpiry}
                                  maxLength={5}
                                />
                                <Input
                                  label="Security CVV Code *"
                                  placeholder="123"
                                  type="password"
                                  value={cardCvv}
                                  onChange={handleCvvChange}
                                  error={paymentErrors.cardCvv}
                                  maxLength={4}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5: Confirmation */}
                {step === 5 && confirmedBooking && (
                  <div className="space-y-6 py-4">
                    {/* Pulsing checkmark and text */}
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck className="w-9 h-9 text-emerald-500 animate-bounce" />
                      </div>
                      <h2 className="font-display text-xl font-black text-gray-900 dark:text-white">Ticket Confirmed!</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        Your pass has been generated. We have emailed the confirmation order and barcode receipt to <strong className="text-gray-700 dark:text-gray-200">{attendeeEmail}</strong>.
                      </p>
                    </div>

                    {/* Dotted digital ticket pass */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-950 shadow-md max-w-sm mx-auto relative">
                      {/* Left and Right Ticket holes notches */}
                      <div className="absolute top-[65%] -left-3 w-6 h-6 rounded-full bg-gray-50 dark:bg-[#0f0f11] border-r border-gray-200 dark:border-gray-800 z-10" />
                      <div className="absolute top-[65%] -right-3 w-6 h-6 rounded-full bg-gray-50 dark:bg-[#0f0f11] border-l border-gray-200 dark:border-gray-800 z-10" />

                      {/* Event Banner */}
                      <div className="relative h-28 bg-gradient-to-br from-brand-600 to-indigo-800 overflow-hidden">
                        {event.bannerUrl && (
                          <img src={event.bannerUrl} alt="Event Cover" className="w-full h-full object-cover opacity-60" />
                        )}
                        <div className="absolute inset-0 bg-black/45" />
                        <div className="absolute bottom-3 left-4 right-4 text-white">
                          <Badge variant="brand" className="text-[8px] py-0.5 mb-1 bg-brand-500">{event.category}</Badge>
                          <h4 className="text-xs font-bold leading-tight leading-4 line-clamp-1">{event.title}</h4>
                        </div>
                      </div>

                      {/* Pass details */}
                      <div className="p-4 space-y-3.5 text-[10px] text-gray-500 pb-5">
                        <div className="grid grid-cols-2 gap-3 text-left">
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block">Attendee</span>
                            <span className="font-bold text-gray-800 dark:text-slate-200 truncate block mt-0.5">{attendeeName}</span>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block">Admissions Tier</span>
                            <span className="font-bold text-brand-500 block mt-0.5">{selectedTier?.name} ({ticketCount} pax)</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-left">
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block">Starts On</span>
                            <span className="font-semibold text-gray-800 dark:text-slate-300 mt-0.5 block">{formatDate(event.startDate)}</span>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block">Venue Location</span>
                            <span className="font-semibold text-gray-800 dark:text-slate-300 mt-0.5 block truncate">{event.venue}, {event.city}</span>
                          </div>
                        </div>

                        {/* Dotted separator line */}
                        <div className="border-t border-dashed border-gray-200 dark:border-gray-800 my-4" />

                        {/* Barcode QR Code wrapper */}
                        <div className="text-center space-y-3.5">
                          {confirmedBooking.qrCode ? (
                            <div className="w-32 h-32 bg-white p-2 border border-gray-200 dark:border-gray-700/60 rounded-2xl mx-auto flex items-center justify-center">
                              <img src={confirmedBooking.qrCode} alt="Pass Checkin QR" className="w-full h-full" />
                            </div>
                          ) : (
                            <div className="w-32 h-32 bg-gray-50 dark:bg-gray-900 border rounded-2xl mx-auto flex items-center justify-center text-xs text-gray-400">
                              PENDING
                            </div>
                          )}
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Order Reference</span>
                            <span className="font-mono text-gray-900 dark:text-slate-200 font-bold mt-1 text-[11px] select-all bg-gray-50 dark:bg-gray-900 py-1 px-3 rounded-lg border border-gray-100 dark:border-gray-800 inline-block">
                              {confirmedBooking.bookingReference}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation actions footer */}
                <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-5 mt-6">
                  {step === 5 ? (
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full text-xs py-2 flex items-center justify-center gap-1.5"
                      onClick={() => navigate('/dashboard/bookings')}
                    >
                      <Ticket className="w-4 h-4" /> Go to Pass Wallet
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={step === 1}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                        onClick={handleBack}
                      >
                        Back
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        rightIcon={step === 4 ? undefined : <ArrowRight className="w-4 h-4" />}
                        onClick={handleNext}
                        isLoading={createBookingMutation.isPending || confirmPaymentMutation.isPending}
                      >
                        {step === 4 ? 'Complete Checkout' : 'Continue'}
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Area: Event & Booking Details Summary Panel */}
          <div className="space-y-6">
            <div className="card overflow-hidden">
              <div className="relative h-32 bg-gray-100 dark:bg-gray-850">
                {event.bannerUrl ? (
                  <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-500/10 flex items-center justify-center">
                    <span className="text-4xl">{getCategoryIcon(event.category)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <Badge variant="brand" className="text-[8px] py-0.5 mb-1 bg-brand-500">{event.category}</Badge>
                  <h3 className="font-bold text-xs leading-tight line-clamp-1">{event.title}</h3>
                </div>
              </div>

              <div className="p-4 space-y-3.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  <span className="text-gray-800 dark:text-gray-200 font-semibold">{formatDate(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-500" />
                  <span className="text-gray-800 dark:text-gray-200 font-semibold">{event.startTime} – {event.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span className="text-gray-800 dark:text-gray-200 font-semibold truncate">{event.venue}, {event.city}</span>
                </div>
              </div>
            </div>

            {/* Sticky invoice subtotal calculator card */}
            <div className="card p-4 space-y-3.5 text-xs">
              <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[10px] pb-1 border-b">
                Booking Invoice
              </h4>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Admissions Ticket</span>
                  <span className="font-semibold text-gray-850 dark:text-gray-200">
                    {selectedTier ? `${formatCurrency(unitPrice)} × ${ticketCount}` : 'None'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-semibold text-gray-850 dark:text-slate-100">{formatCurrency(subtotal)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                    <span>Discount Coupon</span>
                    <span>− {formatCurrency(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">GST (18% inclusive)</span>
                  <span className="font-semibold text-gray-850 dark:text-gray-200">{formatCurrency(gstTax)}</span>
                </div>

                <div className="border-t border-dashed my-1.5" />

                <div className="flex justify-between items-center text-gray-950 dark:text-white font-black text-sm">
                  <span>Grand Total</span>
                  <span className="text-brand-500">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

// Utility class concatenator helper if not already declared in custom component
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
