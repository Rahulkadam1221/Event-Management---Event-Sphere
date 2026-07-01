import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar, MapPin, Users, Clock, Share2, Heart, ArrowLeft,
  CheckCircle, Tag, Star, MessageCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../lib/axios';
import { Event, TicketTier } from '../types';
import { PageWrapper } from '../components/layout/PageWrapper';
import { EventCard } from '../components/events/EventCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency, getCategoryIcon, TICKET_TYPE_COLORS } from '../lib/utils';
import toast from 'react-hot-toast';

interface ScheduleItem {
  time: string;
  title: string;
  description: string;
}

interface MockSpeaker {
  name: string;
  role: string;
  company: string;
  avatar?: string;
}

interface MockReview {
  id: string;
  name: string;
  rating: number;
  date: string;
  comment: string;
}

const getMockTimeline = (category: string): ScheduleItem[] => {
  const normalized = category.toLowerCase();
  if (normalized === 'technology' || normalized === 'business') {
    return [
      { time: '09:00 AM', title: 'Registration & Coffee', description: 'Pick up your event badge and enjoy complimentary morning refreshments.' },
      { time: '10:00 AM', title: 'Keynote Session', description: 'Opening address detailing industry breakthroughs, market disruptions, and future visions.' },
      { time: '12:00 PM', title: 'Interactive Panel', description: 'Discussion featuring prominent thought leaders followed by a live audience Q&A session.' },
      { time: '01:00 PM', title: 'Networking Lunch', description: 'Enjoy a gourmet lunch while exchanging ideas with fellow attendees and professionals.' },
      { time: '02:30 PM', title: 'Technical Workshop', description: 'Hands-on breakout session exploring real-world implementations, strategies, and case studies.' },
      { time: '04:30 PM', title: 'Closing Remarks & Mixer', description: 'Summary of the day\'s insights followed by evening cocktail networking.' },
    ];
  } else if (normalized === 'music' || normalized === 'arts') {
    return [
      { time: '04:00 PM', title: 'Doors Open', description: 'Gate access opens for general admission and VIP badge holders.' },
      { time: '05:30 PM', title: 'Opening Act', description: 'Rising local talent sets the mood with a captivating acoustic performance.' },
      { time: '07:00 PM', title: 'Main Support Show', description: 'Acclaimed artist takes the stage with an energetic, visual-rich performance.' },
      { time: '09:00 PM', title: 'Headliner Performance', description: 'The main act delivers an unforgettable show featuring their greatest hits and custom light visuals.' },
      { time: '11:00 PM', title: 'Afterparty DJ Set', description: 'Late-night electronic set for fans wanting to dance the night away.' },
    ];
  } else {
    return [
      { time: '09:30 AM', title: 'Check-in & Welcoming', description: 'Registrations open at the front desk with light drinks and meet-ups.' },
      { time: '10:30 AM', title: 'Part 1: Foundational Seminar', description: 'A deep dive into core concepts, historical context, and foundational skills.' },
      { time: '01:00 PM', title: 'Catered Lunch break', description: 'A relaxed break with delicious food options and casual chat.' },
      { time: '02:15 PM', title: 'Part 2: Practical Lab', description: 'Putting concepts into practice with peer collaboration and mentor feedback.' },
      { time: '04:00 PM', title: 'Showcase & Q&A', description: 'Presenting group projects followed by open group discussion and feedback.' },
    ];
  }
};

const getMockSpeakers = (category: string): MockSpeaker[] => {
  const normalized = category.toLowerCase();
  if (normalized === 'technology') {
    return [
      { name: 'Dr. Evelyn Foster', role: 'AI Research Director', company: 'DeepMind', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
      { name: 'Liam Carter', role: 'SaaS Platform Architect', company: 'Stripe', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { name: 'Elena Rostova', role: 'DevRel Lead', company: 'Vercel', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    ];
  } else if (normalized === 'business') {
    return [
      { name: 'Marc Andreessen', role: 'General Partner', company: 'a16z', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
      { name: 'Sophia Chen', role: 'Growth Strategy VP', company: 'Linear', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    ];
  } else if (normalized === 'design') {
    return [
      { name: 'Aki Tanaka', role: 'Principal Designer', company: 'Figma', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
      { name: 'Zara Hadley', role: 'UX Research Lead', company: 'Airbnb', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    ];
  } else if (normalized === 'music') {
    return [
      { name: 'DJ Solaris', role: 'Electronic Producer', company: 'Neon Records', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
      { name: 'Marcus Vance', role: 'Lead Vocalist', company: 'The Horizons', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150' },
    ];
  } else {
    return [
      { name: 'Sarah Jenkins', role: 'Lead Organizer', company: 'EventSphere', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
      { name: 'Michael Novak', role: 'Guest Instructor', company: 'Creative Labs', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    ];
  }
};

const getInitialReviews = (_category: string): MockReview[] => {
  return [
    { id: '1', name: 'Rohan Sharma', rating: 5, date: '2 weeks ago', comment: 'An absolutely incredible experience. Everything from the organization to the actual content was top-tier. Worth every rupee!' },
    { id: '2', name: 'Priya Patel', rating: 4, date: '1 month ago', comment: 'Loved the workshops and networking sessions. The venue was a bit crowded, but the speakers were outstanding.' },
    { id: '3', name: 'Vikram Singh', rating: 5, date: '1 month ago', comment: 'Superbly managed! Got a chance to talk to several mentors and fellow developers. Will definitely join next time.' },
  ];
};

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);

  // Wishlist state persisted in localStorage
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('eventsphere-wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Scroll sub-navigation state
  const [activeSection, setActiveSection] = useState('about');

  // Reviews list state
  const [reviews, setReviews] = useState<MockReview[]>([]);

  // Fetch Event Data
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Event }>(`/events/${id}`);
      return data.data;
    },
  });

  // Fetch Related Events in same category
  const { data: relatedEvents } = useQuery({
    queryKey: ['related-events', event?.category],
    queryFn: async () => {
      if (!event?.category) return [];
      const params = new URLSearchParams();
      params.set('category', event.category);
      params.set('status', 'PUBLISHED');
      params.set('limit', '4');
      const { data } = await api.get<{ data: Event[] }>(`/events?${params}`);
      return data.data.filter(e => e.id !== event.id);
    },
    enabled: !!event?.category,
  });

  // Initialize reviews and ticket tier defaults
  useEffect(() => {
    if (event) {
      setReviews(getInitialReviews(event.category));
      if (event.ticketTiers.length > 0) {
        setSelectedTier(event.ticketTiers.find(t => t.isActive) || event.ticketTiers[0]);
      }
    }
  }, [event]);

  // Sync scroll position with active sections
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      const targetSections = ['about', 'timeline', 'speakers', 'venue', 'reviews', 'related'];
      for (const sectionId of targetSections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  // Load saved events from backend to seed local wishlist on mount
  useEffect(() => {
    const syncWishlist = async () => {
      if (isAuthenticated) {
        try {
          const { data } = await api.get<{ data: Event[] }>('/events/saved');
          const savedIds = data.data.map(e => e.id);
          setWishlist(savedIds);
          localStorage.setItem('eventsphere-wishlist', JSON.stringify(savedIds));
        } catch {
          // Ignore
        }
      }
    };
    syncWishlist();
  }, [isAuthenticated]);

  const isWishlisted = event ? wishlist.includes(event.id) : false;

  const toggleWishlist = async () => {
    if (!event) return;
    
    if (isAuthenticated) {
      try {
        await api.post(`/events/${event.id}/save`);
      } catch (err) {
        // Fail silently or log error, but proceed with local toggle
      }
    }

    let nextWishlist: string[];
    if (isWishlisted) {
      nextWishlist = wishlist.filter(item => item !== event.id);
      toast.success('Removed from bookmarks');
    } else {
      nextWishlist = [...wishlist, event.id];
      toast.success('Saved to bookmarks ❤️');
    }
    setWishlist(nextWishlist);
    localStorage.setItem('eventsphere-wishlist', JSON.stringify(nextWishlist));
  };

  // Star Rating feedback submit handler
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewName, setNewReviewName] = useState(user?.name || '');

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    const reviewName = newReviewName.trim() || 'Anonymous';
    const newRev: MockReview = {
      id: Date.now().toString(),
      name: reviewName,
      rating: newReviewRating,
      date: 'Just now',
      comment: newReviewComment.trim(),
    };
    setReviews([newRev, ...reviews]);
    setNewReviewComment('');
    setNewReviewRating(5);
    toast.success('Thank you! Review submitted successfully 🎉');
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-80 rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!event) {
    return (
      <PageWrapper>
        <div className="text-center py-32">
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Event not found</h2>
          <p className="text-gray-400 mb-6">The event you\'re looking for doesn\'t exist or has been removed.</p>
          <Button onClick={() => navigate('/events')}>Browse Events</Button>
        </div>
      </PageWrapper>
    );
  }

  const minPrice = event.ticketTiers.length > 0 ? Math.min(...event.ticketTiers.map(t => t.price)) : 0;
  const isOrganizer = user?.id === event.organizerId;
  const isSoldOut = event.availableSeats === 0;

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '4.8';

  const sections = [
    { id: 'about', label: 'About' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'venue', label: 'Venue' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'related', label: 'Related' },
  ];

  const handleScrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const offset = 120; // sticky header + subnav offsets
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSection(sectionId);
    }
  };

  return (
    <PageWrapper>
      {/* Banner */}
      <div className="relative h-80 sm:h-96 overflow-hidden">
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-600 via-violet-600 to-purple-700 flex items-center justify-center">
            <span className="text-8xl">{getCategoryIcon(event.category)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-20 left-6 flex items-center gap-2 text-white/80 hover:text-white bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Action buttons */}
        <div className="absolute top-20 right-6 flex gap-2">
          <button onClick={handleShare} className="p-2.5 rounded-xl bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={toggleWishlist}
            className={`p-2.5 rounded-xl bg-black/30 backdrop-blur-sm transition-colors ${
              isWishlisted ? 'text-rose-500 hover:bg-black/40' : 'text-white hover:bg-black/50'
            }`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
          </button>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-3">
              {event.isFeatured && <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-900">⭐ Featured</span>}
              {event.isTrending && <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white">🔥 Trending</span>}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                {getCategoryIcon(event.category)} {event.category}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-white">{event.title}</h1>
          </div>
        </div>
      </div>

      {/* Sticky Sub-navigation */}
      <div className="sticky top-16 z-20 bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto py-3 no-scrollbar scroll-smooth">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => handleScrollTo(section.id)}
                className={`text-sm font-semibold whitespace-nowrap transition-colors relative pb-1 ${
                  activeSection === section.id
                    ? 'text-brand-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {section.label}
                {activeSection === section.id && (
                  <motion.div
                    layoutId="activeSubSection"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <section id="about" className="scroll-mt-24 space-y-8">
              {/* Quick info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: Calendar, label: 'Date', value: formatDate(event.startDate), color: 'text-brand-500' },
                  { icon: Clock, label: 'Time', value: `${event.startTime} – ${event.endTime}`, color: 'text-violet-500' },
                  { icon: MapPin, label: 'Venue', value: `${event.venue}, ${event.city}`, color: 'text-rose-500' },
                  { icon: Users, label: 'Capacity', value: `${event.availableSeats} left`, color: 'text-emerald-500' },
                ].map(item => (
                  <div key={item.label} className="card p-4">
                    <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                    <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="card p-6">
                <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-4">About This Event</h2>
                <div className={`text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-3 ${!descExpanded && 'line-clamp-5'}`}>
                  {event.description.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="mt-3 flex items-center gap-1.5 text-sm text-brand-500 font-semibold"
                >
                  {descExpanded ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Read more</>}
                </button>
              </div>

              {/* Tags */}
              {event.tags.length > 0 && (
                <div className="card p-6">
                  <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-brand-500" /> Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Organizer */}
              <div className="card p-6">
                <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" /> Organizer
                </h2>
                <div className="flex items-start gap-4">
                  <Avatar src={event.organizer.avatar} name={event.organizer.name} size="lg" />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{event.organizer.name}</p>
                    {event.organizer.bio && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{event.organizer.bio}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat link */}
              {isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6 border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-brand-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white">Event Chat</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Connect with other attendees in real-time</p>
                    </div>
                    <Button size="sm" onClick={() => navigate(`/dashboard/chat/${event.id}`)}>
                      Join Chat
                    </Button>
                  </div>
                </motion.div>
              )}
            </section>

            {/* Timeline Schedule Section */}
            <section id="timeline" className="card p-6 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-6">Event Schedule</h2>
              <div className="relative border-l border-gray-200 dark:border-gray-800 ml-4 space-y-8">
                {getMockTimeline(event.category).map((item, idx) => (
                  <div key={idx} className="relative pl-8">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-brand-500 bg-white dark:bg-gray-900 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                      <span className="text-xs font-bold text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-2.5 py-1 rounded-lg w-max shrink-0">
                        {item.time}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Speakers Section */}
            <section id="speakers" className="card p-6 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-6">
                Featured Speakers & Hosts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {getMockSpeakers(event.category).map((speaker, idx) => (
                  <div key={idx} className="group card p-4 border border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800 transition-all duration-300 flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-gray-100 dark:border-gray-800 group-hover:border-brand-500 transition-colors">
                      {speaker.avatar ? (
                        <img src={speaker.avatar} alt={speaker.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xl font-bold text-brand-500">
                          {speaker.name[0]}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                      {speaker.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{speaker.role}</p>
                    <p className="text-[10px] text-brand-500 font-semibold bg-brand-50 dark:bg-brand-900/10 px-2 py-0.5 rounded-full mt-2">
                      {speaker.company}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Venue & Map Section */}
            <section id="venue" className="card p-6 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-4">Venue & Geolocation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{event.venue}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{event.address}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{event.city}, {event.state}, {event.country}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 space-y-2">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">How to reach:</p>
                    <p>🚗 <strong>By Road:</strong> Access via Western Express Highway or local express links. Parking is available on-site.</p>
                    <p>🚇 <strong>By Metro/Train:</strong> Closest local rail station is 10 minutes away by auto-rickshaw or shuttle service.</p>
                  </div>
                </div>

                <div className="relative h-60 bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
                  <svg className="absolute inset-0 w-full h-full text-slate-800 stroke-[1.5]" viewBox="0 0 400 200" fill="none">
                    <path d="M-50,120 Q100,50 250,150 T550,100" />
                    <path d="M-50,60 Q120,160 200,90 T550,140" opacity="0.5" />
                    <path d="M-50,160 Q80,90 300,170 T550,80" opacity="0.3" />
                  </svg>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="absolute w-12 h-12 rounded-full bg-brand-500/20 animate-ping" />
                    <div className="absolute w-8 h-8 rounded-full bg-brand-500/40 animate-pulse" />
                    <div className="w-4 h-4 rounded-full bg-brand-500 border-2 border-white shadow-lg flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <span className="mt-2 text-xs font-bold text-white bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800 backdrop-blur-sm shadow-md text-center max-w-[150px] truncate">
                      {event.venue}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 flex flex-col gap-1">
                    <button className="w-8 h-8 rounded-lg bg-slate-950/80 border border-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-900 transition-colors shadow-md text-sm">+</button>
                    <button className="w-8 h-8 rounded-lg bg-slate-950/80 border border-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-900 transition-colors shadow-md text-sm">−</button>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400 px-2 py-1 rounded-md backdrop-blur-sm shadow-md">
                    LAT: {event.latitude || '19.0760'}° N | LNG: {event.longitude || '72.8777'}° E
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews Section */}
            <section id="reviews" className="card p-6 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-brand-500" /> Attendee Reviews ({reviews.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
                <div className="text-center">
                  <p className="font-display text-5xl font-black text-gray-900 dark:text-white">{averageRating}</p>
                  <div className="flex justify-center gap-0.5 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.round(parseFloat(averageRating)) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Out of 5 stars based on reviews</p>
                </div>

                <div className="md:col-span-2 space-y-2">
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = reviews.filter(r => r.rating === stars).length;
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="w-3 text-right">{stars}</span>
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Input Form */}
              <form onSubmit={handleAddReview} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 mb-6 space-y-4">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Leave your feedback</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(stars => (
                        <button
                          type="button"
                          key={stars}
                          onClick={() => setNewReviewRating(stars)}
                          className="text-amber-400 hover:scale-110 transition-transform"
                        >
                          <Star className={`w-5 h-5 ${newReviewRating >= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {!user && (
                    <input
                      type="text"
                      placeholder="Your name"
                      value={newReviewName}
                      onChange={e => setNewReviewName(e.target.value)}
                      className="input-base text-xs py-1.5 px-3 max-w-[200px]"
                    />
                  )}
                </div>

                <div className="flex gap-3">
                  <textarea
                    placeholder="Share your thoughts about this experience..."
                    value={newReviewComment}
                    onChange={e => setNewReviewComment(e.target.value)}
                    className="input-base text-xs py-2 px-3 resize-none h-16 w-full"
                  />
                  <Button type="submit" size="sm" className="self-end shrink-0">Submit</Button>
                </div>
              </form>

              {/* Review list */}
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-transparent">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar name={rev.name} size="sm" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">{rev.name}</h4>
                        <p className="text-[10px] text-gray-400">{rev.date}</p>
                      </div>
                      <div className="flex gap-0.5 ml-auto">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed pl-1">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Booking widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-4">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Starting from</p>
                    <p className="font-display text-3xl font-black text-brand-500">{formatCurrency(minPrice)}</p>
                  </div>
                  {isSoldOut ? (
                    <Badge variant="danger">Sold Out</Badge>
                  ) : (
                    <Badge variant="success">{event.availableSeats} left</Badge>
                  )}
                </div>

                {/* Ticket tiers */}
                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Ticket</p>
                  {event.ticketTiers.filter(t => t.isActive).map(tier => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      disabled={tier.quantity - tier.sold <= 0}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedTier?.id === tier.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                      } ${tier.quantity - tier.sold <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">{tier.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TICKET_TYPE_COLORS[tier.type]}`}>
                              {tier.type}
                            </span>
                          </div>
                          {tier.description && <p className="text-xs text-gray-500 dark:text-gray-400">{tier.description}</p>}
                          {tier.perks && tier.perks.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {tier.perks.slice(0, 2).map(perk => (
                                <li key={perk} className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle className="w-3 h-3" /> {perk}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-500 text-sm">{formatCurrency(tier.price)}</p>
                          <p className="text-xs text-gray-400">{tier.quantity - tier.sold} left</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quantity */}
                {selectedTier && (
                  <div className="flex items-center gap-3 mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Quantity</p>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >−</button>
                      <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{ticketCount}</span>
                      <button
                        onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >+</button>
                    </div>
                  </div>
                )}

                {/* Total */}
                {selectedTier && (
                  <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-800 mb-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedTier.price * ticketCount)}</span>
                  </div>
                )}

                {isOrganizer ? (
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => navigate(`/dashboard/events/${event.id}/edit`)}
                  >
                    Edit Event
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/checkout/${event.id}?tier=${selectedTier?.id}&quantity=${ticketCount}`)}
                    disabled={isSoldOut || !selectedTier}
                  >
                    {isSoldOut ? 'Sold Out' : 'Book Now'}
                  </Button>
                )}
              </div>

              {/* Location card quick info */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" /> Location
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{event.venue}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{event.address}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{event.city}, {event.state}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Events horizontal grid */}
        <section id="related" className="scroll-mt-24 border-t border-gray-200 dark:border-gray-800 pt-16 mt-16">
          <h2 className="font-display text-2xl font-black text-gray-900 dark:text-white mb-6">
            Similar Experiences
          </h2>
          {relatedEvents && relatedEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedEvents.map((e, index) => (
                <EventCard key={e.id} event={e} index={index} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
              No similar experiences in this category found yet.
            </div>
          )}
        </section>
      </div>

    </PageWrapper>
  );
};
