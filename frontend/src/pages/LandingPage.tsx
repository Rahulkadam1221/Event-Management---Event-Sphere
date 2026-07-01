import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Sparkles,
  Users,
  Calendar,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Search,
  MapPin,
  CheckCircle,
  Mail,
  PartyPopper
} from 'lucide-react';
import { api } from '../lib/axios';
import { Event, ApiResponse } from '../types';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EventCard } from '../components/events/EventCard';
import { EventCardSkeleton } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import toast from 'react-hot-toast';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const STATS = [
  { label: 'Events Hosted', value: '12,500+', icon: Calendar },
  { label: 'Active Attendees', value: '780K+', icon: Users },
  { label: 'Cities Covered', value: '60+', icon: Globe },
  { label: 'Ticket Transactions', value: '₹64Cr+', icon: TrendingUp },
];

const BENEFITS = [
  {
    icon: Zap,
    title: 'Lightning-Fast Publishing',
    desc: 'Launch your event page in under 5 minutes with our wizard-style drafts auto-saving feature.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10'
  },
  {
    icon: Shield,
    title: 'Pre-Integrated Checkout',
    desc: 'Accept payments immediately through Razorpay and Stripe gateways with GST itemized invoices.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10'
  },
  {
    icon: Users,
    title: 'Interactive Event Chats',
    desc: 'Provide chat rooms with Discord/Slack aesthetics, emoji reactions, typing indicators, and attendee tags.',
    color: 'text-brand-500',
    bg: 'bg-brand-500/10'
  },
  {
    icon: TrendingUp,
    title: 'Actionable Dashboards',
    desc: 'Analyze seat charts, gross payout receipts, and download CSV registration lists instantly.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10'
  },
  {
    icon: Globe,
    title: 'Contactless Gate Control',
    desc: 'Verify registrations at check-in gates using a mobile QR scanner or your device camera.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10'
  },
  {
    icon: Sparkles,
    title: 'Automated Reminders',
    desc: 'Reduce attendee no-show rates with automated schedule notification alerts sent via email.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10'
  },
];

const CATEGORIES = [
  { name: 'Technology', icon: '💻', count: '1.2k events', gradient: 'from-blue-500/10 to-brand-500/10' },
  { name: 'Music', icon: '🎵', count: '850 events', gradient: 'from-pink-500/10 to-rose-500/10' },
  { name: 'Design', icon: '🎨', count: '450 events', gradient: 'from-purple-500/10 to-violet-500/10' },
  { name: 'Business', icon: '💼', count: '620 events', gradient: 'from-amber-500/10 to-orange-500/10' },
  { name: 'Food', icon: '🍽️', count: '310 events', gradient: 'from-emerald-500/10 to-teal-500/10' },
  { name: 'Sports', icon: '⚽', count: '280 events', gradient: 'from-cyan-500/10 to-blue-500/10' },
];

const TESTIMONIALS = [
  {
    name: 'Sarah Jenkins',
    role: 'Tech Event Organizer',
    text: 'EventSphere changed everything for our summit. The automated invoice generation and developer sandbox settings saved us endless administrative hours.',
    rating: 5
  },
  {
    name: 'Alex Kumar',
    role: 'Product Specialist',
    text: 'Attending conferences feels so community-driven now. The live chat updates and instant QR ticket printing in my wallet are exceptionally well designed.',
    rating: 5
  },
  {
    name: 'Priya Sharma',
    role: 'Music Tour Promoter',
    text: 'We hosted a 10,000-seat outdoor festival. The entry check-in via the dashboard’s camera scanner was fast, reliable, and smooth.',
    rating: 5
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Fetch events from database
  const { data: eventsResponse, isLoading: eventsLoading } = useQuery<ApiResponse<Event[]>>({
    queryKey: ['landing-events'],
    queryFn: async () => {
      const { data } = await api.get('/events?status=PUBLISHED&limit=8');
      return data;
    },
  });

  const events = eventsResponse?.data ?? [];
  const featuredEvents = events.filter((e) => e.isFeatured).slice(0, 3);
  const upcomingEvents = events.slice(0, 6);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (cityQuery) params.set('city', cityQuery);
    navigate(`/events?${params.toString()}`);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSubscribed(true);
    setNewsletterEmail('');
    toast.success('Thank you for subscribing to our newsletter!');
  };

  return (
    <PageWrapper className="relative">
      {/* Background Ornaments */}
      <div className="absolute inset-x-0 top-0 h-[800px] bg-gradient-to-b from-brand-50/40 via-white to-transparent dark:from-brand-950/10 dark:via-[#0f0f11] dark:to-transparent pointer-events-none -z-10" />
      <div className="absolute top-48 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div {...stagger} animate="animate" initial="initial" className="space-y-6">
            <motion.div {...fadeUp} className="inline-flex">
              <Badge variant="brand" className="px-4 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
                The Next-Gen SaaS Event Management Platform
              </Badge>
            </motion.div>

            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white leading-none tracking-tight max-w-4xl mx-auto"
            >
              Organize experiences that{' '}
              <span className="gradient-text">
                inspire connections.
              </span>
            </motion.h1>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
            >
              The all-in-one suite to draft events, manage tickets, accept payments, connect attendees in live chats, and monitor real-time ticket sales.
            </motion.p>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Button size="lg" onClick={() => navigate('/events')} rightIcon={<ArrowRight className="w-5 h-5" />}>
                Explore Experiences
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth/register')}>
                Start Organizing Free
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Search Events Section */}
      <section className="max-w-5xl mx-auto px-6 -mt-4 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass p-4 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/5"
        >
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <Input
                label="Search Keyword"
                placeholder="Ex. Web Summit, Music Festival..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                className="bg-white/60 dark:bg-gray-950/60"
              />
            </div>
            <div className="sm:col-span-3">
              <Select
                label="Category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  { value: 'Technology', label: '💻 Technology' },
                  { value: 'Music', label: '🎵 Music' },
                  { value: 'Design', label: '🎨 Design' },
                  { value: 'Business', label: '💼 Business' },
                  { value: 'Food', label: '🍽️ Food' },
                  { value: 'Sports', label: '⚽ Sports' },
                ]}
                className="bg-white/60 dark:bg-gray-950/60"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="City / Location"
                placeholder="Ex. Mumbai"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4 text-gray-400" />}
                className="bg-white/60 dark:bg-gray-950/60"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full h-11 rounded-xl shadow-brand" variant="primary">
                Find Events
              </Button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* Featured Events Section */}
      <section className="py-16 bg-gray-50/50 dark:bg-gray-900/10 border-y border-gray-200/50 dark:border-gray-800/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex mb-2">
                <Badge variant="brand" className="font-semibold">Curated Experiences</Badge>
              </div>
              <h2 className="section-heading">Featured Events</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/events')} rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All Events
            </Button>
          </div>

          {eventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredEvents.map((event, idx) => (
                <EventCard key={event.id} event={event} index={idx} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center max-w-lg mx-auto space-y-4">
              <PartyPopper className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-bold">No Featured Events Right Now</h3>
              <p className="text-sm text-gray-500">Explore the general event directory to search for upcoming activities.</p>
              <Button onClick={() => navigate('/events')} size="sm">Browse General Events</Button>
            </div>
          )}
        </div>
      </section>

      {/* Categories Grid Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="section-heading mb-3">Browse by Category</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Discover events customized to your favorite professional topics and creative niches.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, i) => (
              <motion.button
                key={cat.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -5, shadow: '0 8px 30px rgba(0,0,0,0.1)' }}
                onClick={() => navigate(`/events?category=${cat.name}`)}
                className={`card p-5 text-center bg-gradient-to-br ${cat.gradient} border border-gray-200/40 dark:border-white/5 transition-all duration-300 cursor-pointer`}
              >
                <div className="text-4xl mb-3">{cat.icon}</div>
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">{cat.name}</h3>
                <span className="inline-block text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 bg-white/60 dark:bg-gray-950/60 px-2 py-0.5 rounded-full border border-gray-200/50 dark:border-white/5">
                  {cat.count}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/20 border-y border-gray-200/50 dark:border-gray-800/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <div className="inline-flex mb-2">
              <Badge variant="brand" className="font-semibold">Why EventSphere?</Badge>
            </div>
            <h2 className="section-heading mb-4">Complete Platform Infrastructure</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Everything needed to configure, scale, and monetize your experiences without external plugins.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Card hover className="h-full p-6 flex flex-col items-start bg-white dark:bg-gray-900">
                  <div className={`w-11 h-11 rounded-xl ${benefit.bg} flex items-center justify-center mb-4`}>
                    <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                  </div>
                  <h3 className="font-display font-bold text-gray-900 dark:text-white text-base mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{benefit.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-white dark:bg-[#0f0f11]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="text-center py-6 px-4 bg-gray-50/50 dark:bg-gray-900/30 border-0" hover>
                  <stat.icon className="w-6 h-6 text-brand-500 mx-auto mb-3" />
                  <h3 className="font-display text-3xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">{stat.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50/50 dark:bg-gray-900/10 border-y border-gray-200/50 dark:border-gray-800/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <div className="inline-flex mb-2">
              <Badge variant="brand" className="font-semibold">Organizer Success</Badge>
            </div>
            <h2 className="section-heading mb-3">Trusted by Community Leaders</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Discover how organizers around the world rely on EventSphere to deliver premium operations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Card hover className="h-full p-6 flex flex-col justify-between bg-white dark:bg-gray-900">
                  <div className="space-y-4">
                    <div className="flex gap-1 text-amber-400 text-xs">
                      {[...Array(testimonial.rating)].map((_, idx) => (
                        <span key={idx}>★</span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic leading-relaxed">
                      "{testimonial.text}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                    <Avatar name={testimonial.name} size="sm" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{testimonial.name}</h4>
                      <p className="text-[11px] text-gray-400">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex mb-2">
                <Badge variant="brand" className="font-semibold">Next Up</Badge>
              </div>
              <h2 className="section-heading">Upcoming Experiences</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/events')}>
              Explore Full Directory
            </Button>
          </div>

          {eventsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, idx) => (
                <EventCard key={event.id} event={event} index={idx} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center max-w-lg mx-auto space-y-4">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-bold">No Events Listed Yet</h3>
              <p className="text-sm text-gray-500">Sign in to your dashboard to publish your very first event draft!</p>
              <Button onClick={() => navigate('/dashboard')} size="sm">Create Event</Button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-gradient-to-r from-brand-600 via-violet-600 to-purple-750 text-white rounded-t-[32px] sm:rounded-t-[48px] overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="inline-flex">
              <span className="bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Newsletter Dispatch
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight">
              Get event drops delivered directly
            </h2>
            <p className="text-sm sm:text-base text-brand-100 max-w-xl mx-auto leading-relaxed">
              Stay ahead of tickets release dates, coupon announcements, and premier tech and arts keynotes near you.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!newsletterSubscribed ? (
              <motion.form
                key="subscription-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleNewsletterSubmit}
                className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 pt-2"
              >
                <div className="flex-1">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-white/20 bg-white/10 text-white placeholder-brand-200 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>
                <Button type="submit" className="bg-white text-brand-600 hover:bg-brand-50 h-11 font-semibold whitespace-nowrap shadow-lg">
                  Subscribe Now
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="success-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 max-w-sm mx-auto p-4 rounded-2xl border border-white/20 flex items-center gap-3 justify-center"
              >
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">You're subscribed successfully!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PageWrapper>
  );
};
