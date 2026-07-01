import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, Plus, Trash2, Upload,
  Check, AlertCircle, ArrowLeft, ArrowRight, X
} from 'lucide-react';
import { api } from '../../lib/axios';
import { TicketTier } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn, getCategoryIcon, formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

interface CreateEventFormProps {
  onSuccess?: () => void;
  eventId?: string;
}

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Tickets' },
  { id: 4, label: 'Banner' },
  { id: 5, label: 'Preview' },
  { id: 6, label: 'Publish' }
];

const CATEGORY_PRESETS: Record<string, string> = {
  Technology: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  Music: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
  Design: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800',
  Business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
  Food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
  Sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
  Arts: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
  Health: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
  Education: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  Gaming: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800',
};

export const CreateEventForm: React.FC<CreateEventFormProps> = ({ onSuccess, eventId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!eventId;
  const [step, setStep] = useState(1);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  // Form Field States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [category, setCategory] = useState('Technology');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [capacity, setCapacity] = useState(100);

  const [ticketTiers, setTicketTiers] = useState<Omit<TicketTier, 'id' | 'eventId'>[]>([
    { name: 'General Admission', type: 'GENERAL', price: 999, quantity: 80, sold: 0, isActive: true }
  ]);

  const [bannerUrl, setBannerUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftRestored, setDraftRestored] = useState(false);

  // Helper to populate form fields from event data
  const populateForm = useCallback((ev: any) => {
    setTitle(ev.title || '');
    setDescription(ev.description || '');
    setShortDesc(ev.shortDesc || '');
    setCategory(ev.category || 'Technology');
    setTags(ev.tags || []);
    setVenue(ev.venue || '');
    setAddress(ev.address || '');
    setCity(ev.city || '');
    setState(ev.state || '');
    setCountry(ev.country || 'India');
    setStartDate(ev.startDate ? ev.startDate.slice(0, 10) : '');
    setEndDate(ev.endDate ? ev.endDate.slice(0, 10) : '');
    setStartTime(ev.startTime || '09:00');
    setEndTime(ev.endTime || '18:00');
    setCapacity(ev.capacity || 100);
    setBannerUrl(ev.bannerUrl || '');
    if (ev.ticketTiers && ev.ticketTiers.length > 0) {
      setTicketTiers(ev.ticketTiers.map((t: any) => ({
        id: t.id, name: t.name, type: t.type, price: t.price, quantity: t.quantity, sold: t.sold || 0, isActive: t.isActive ?? true
      })));
    }
  }, []);

  // 0. Load event data if in edit mode
  useEffect(() => {
    if (isEditMode && eventId) {
      setIsLoadingEvent(true);
      api.get(`/events/${eventId}`).then(res => {
        populateForm(res.data.data);
      }).catch(() => {
        toast.error('Failed to load event data');
      }).finally(() => {
        setIsLoadingEvent(false);
      });
    }
  }, [isEditMode, eventId, populateForm]);

  // 1. Auto-save State to LocalStorage Draft (only in create mode)
  useEffect(() => {
    if (isEditMode) return;
    try {
      const stored = localStorage.getItem('eventsphere-wizard-draft');
      if (stored) {
        const parsed = JSON.parse(stored);
        populateForm(parsed);
        setDraftRestored(true);
      }
    } catch {
      // Ignore
    }
  }, [isEditMode, populateForm]);

  // Save changes to draft (only in create mode)
  useEffect(() => {
    if (isEditMode) return;
    if (title || description || venue || city || bannerUrl || ticketTiers.length > 1) {
      const draft = {
        title, description, shortDesc, category, tags, venue, address, city, state, country,
        startDate, endDate, startTime, endTime, capacity, ticketTiers, bannerUrl
      };
      localStorage.setItem('eventsphere-wizard-draft', JSON.stringify(draft));
    }
  }, [isEditMode, title, description, shortDesc, category, tags, venue, address, city, state, country, startDate, endDate, startTime, endTime, capacity, ticketTiers, bannerUrl]);

  const discardDraft = () => {
    localStorage.removeItem('eventsphere-wizard-draft');
    setTitle('');
    setDescription('');
    setShortDesc('');
    setCategory('Technology');
    setTags([]);
    setVenue('');
    setAddress('');
    setCity('');
    setState('');
    setCountry('India');
    setStartDate('');
    setEndDate('');
    setStartTime('09:00');
    setEndTime('18:00');
    setCapacity(100);
    setTicketTiers([{ name: 'General Admission', type: 'GENERAL', price: 999, quantity: 80, sold: 0, isActive: true }]);
    setBannerUrl('');
    setStep(1);
    setErrors({});
    setDraftRestored(false);
    toast.success('Draft cleared successfully');
  };

  // 2. Validate current step parameters
  const validateStep = (currentStep: number): boolean => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (title.trim().length < 3) nextErrors.title = 'Title must be at least 3 characters';
      if (description.trim().length < 10) nextErrors.description = 'Description must be at least 10 characters';
      if (!category) nextErrors.category = 'Category selection is required';
    }

    if (currentStep === 2) {
      if (!venue.trim()) nextErrors.venue = 'Venue name is required';
      if (!address.trim()) nextErrors.address = 'Street address is required';
      if (!city.trim()) nextErrors.city = 'City is required';
      if (!state.trim()) nextErrors.state = 'State is required';
      if (!startDate) nextErrors.startDate = 'Start date is required';
      if (!endDate) nextErrors.endDate = 'End date is required';
      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        nextErrors.endDate = 'End date must be on or after start date';
      }
      if (!startTime) nextErrors.startTime = 'Start time is required';
      if (!endTime) nextErrors.endTime = 'End time is required';
    }

    if (currentStep === 3) {
      if (capacity <= 0) nextErrors.capacity = 'Capacity must be greater than 0';
      if (ticketTiers.length === 0) nextErrors.tiers = 'Must add at least one ticket tier';
      
      let sumQuantities = 0;
      ticketTiers.forEach((tier, i) => {
        if (!tier.name.trim()) nextErrors[`tierName_${i}`] = 'Tier name required';
        if (tier.price < 0) nextErrors[`tierPrice_${i}`] = 'Price cannot be negative';
        if (tier.quantity <= 0) nextErrors[`tierQuantity_${i}`] = 'Quantity must be positive';
        sumQuantities += tier.quantity;
      });

      if (sumQuantities > capacity) {
        nextErrors.capacityLimit = `Sum of tier quantities (${sumQuantities}) exceeds total event capacity (${capacity})`;
      }
    }

    if (currentStep === 4) {
      if (!bannerUrl) {
        nextErrors.banner = 'Please select a preset banner or upload a custom image';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, STEPS.length));
    } else {
      toast.error('Please correct errors before proceeding');
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  // Tags handlers
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().replace(/#/g, '');
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Ticket tier handlers
  const handleAddTier = () => {
    setTicketTiers([...ticketTiers, { name: 'VIP Pass', type: 'VIP', price: 2999, quantity: 20, sold: 0, isActive: true }]);
  };

  const handleRemoveTier = (idx: number) => {
    setTicketTiers(ticketTiers.filter((_, i) => i !== idx));
  };

  const handleTierChange = (idx: number, key: string, val: any) => {
    const next = [...ticketTiers];
    next[idx] = { ...next[idx], [key]: val };
    setTicketTiers(next);
  };

  // File Upload Handlers
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setBannerUrl(e.target.result as string);
        toast.success('Banner uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Mutation to Create or Update Event
  const createEventMutation = useMutation({
    mutationFn: async (payload: { status: 'DRAFT' | 'PUBLISHED' }) => {
      const body = {
        title, description, shortDesc: shortDesc || undefined, category, tags,
        venue, address, city, state, country, startDate, endDate, startTime, endTime,
        capacity: Number(capacity), ticketTiers: ticketTiers, bannerUrl: bannerUrl || undefined,
        status: payload.status
      };
      if (isEditMode) {
        const { data } = await api.patch(`/events/${eventId}`, body);
        return data.data;
      } else {
        const { data } = await api.post('/events', body);
        return data.data;
      }
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Event updated successfully! ✅' : 'Event campaign launched successfully! 🎉');
      if (!isEditMode) localStorage.removeItem('eventsphere-wizard-draft');
      
      // Invalidate all query caches relating to events lists and event details
      queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
      queryClient.invalidateQueries({ queryKey: ['organizer-events-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-events-full'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['landing-events'] });
      
      if (onSuccess) onSuccess(); else navigate('/dashboard/events');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || (isEditMode ? 'Failed to update event' : 'Failed to create event campaign'));
    },
  });

  if (isLoadingEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading event details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Recovery Alert banner */}
      {draftRestored && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Resumed draft details from local backup</span>
          </div>
          <button onClick={discardDraft} className="underline font-bold hover:text-amber-900 dark:hover:text-amber-300">
            Discard draft
          </button>
        </div>
      )}

      {/* Stepper Progress bar */}
      <div className="card p-5">
        <div className="flex justify-between items-center relative">
          {/* Connector bar background */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 z-0" />
          
          {/* Active indicator bar */}
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
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id >= step}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-xs transition-all duration-200',
                    isCompleted ? 'bg-brand-500 border-brand-500 text-white' :
                    isActive ? 'bg-white dark:bg-gray-900 border-brand-500 text-brand-500 shadow-md ring-4 ring-brand-500/20' :
                    'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                  )}
                >
                  {isCompleted ? <Check className="w-4.5 h-4.5" /> : s.id}
                </button>
                <span className={cn('text-[10px] font-bold mt-2 hidden sm:block',
                  isActive ? 'text-brand-500 font-black' : 'text-gray-400'
                )}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Form fields card */}
      <div className="card p-6 min-h-[400px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Basic Information</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Let\'s start with event titles, headline, and categories.</p>
                </div>
                
                <div>
                  <label className="label">Campaign Title *</label>
                  <input
                    type="text"
                    className={cn('input-base', errors.title && 'border-red-500 focus:border-red-500')}
                    placeholder="Ex. NextGen Tech Summit 2026"
                    value={title}
                    onChange={e => { setTitle(e.target.value); if (errors.title) setErrors({}); }}
                  />
                  {errors.title && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.title}</p>}
                </div>

                <div>
                  <label className="label">Short Headline</label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="Ex. Connect with 5000+ developers and tech leaders"
                    value={shortDesc}
                    onChange={e => setShortDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category *</label>
                    <select
                      className="input-base"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      {['Technology', 'Music', 'Design', 'Business', 'Food', 'Sports', 'Arts', 'Health', 'Education', 'Gaming'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">Event Tags (press Enter)</label>
                    <input
                      type="text"
                      className="input-base"
                      placeholder="Add tag and press enter..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map(t => (
                        <Badge key={t} variant="brand" className="text-[10px] py-0.5 pl-2 pr-1.5 flex items-center gap-1">
                          #{t}
                          <button type="button" onClick={() => handleRemoveTag(t)} className="hover:bg-brand-600 rounded-full p-0.5 text-white/80 hover:text-white">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Full Details Description *</label>
                  <textarea
                    className={cn('input-base h-40 resize-none', errors.description && 'border-red-500')}
                    placeholder="Provide detailed description of key takeaways, guest speakers, sessions timetable, and directions..."
                    value={description}
                    onChange={e => { setDescription(e.target.value); if (errors.description) setErrors({}); }}
                  />
                  {errors.description && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
                </div>
              </div>
            )}

            {/* STEP 2: Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Location & Date settings</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Where and when does this experience take place?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Date *</label>
                    <input
                      type="date"
                      className={cn('input-base', errors.startDate && 'border-red-500')}
                      value={startDate}
                      onChange={e => { setStartDate(e.target.value); if (errors.startDate) setErrors({}); }}
                    />
                  </div>
                  <div>
                    <label className="label">End Date *</label>
                    <input
                      type="date"
                      className={cn('input-base', errors.endDate && 'border-red-500')}
                      value={endDate}
                      onChange={e => { setEndDate(e.target.value); if (errors.endDate) setErrors({}); }}
                    />
                  </div>
                </div>
                {(errors.startDate || errors.endDate) && (
                  <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.startDate || errors.endDate}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Time *</label>
                    <input
                      type="time"
                      className="input-base"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">End Time *</label>
                    <input
                      type="time"
                      className="input-base"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Venue Name *</label>
                  <input
                    type="text"
                    className={cn('input-base', errors.venue && 'border-red-500')}
                    placeholder="Ex. NESCO Exhibition Centre"
                    value={venue}
                    onChange={e => { setVenue(e.target.value); if (errors.venue) setErrors({}); }}
                  />
                </div>

                <div>
                  <label className="label">Street Address *</label>
                  <input
                    type="text"
                    className={cn('input-base', errors.address && 'border-red-500')}
                    placeholder="Ex. Western Express Highway, Goregaon East"
                    value={address}
                    onChange={e => { setAddress(e.target.value); if (errors.address) setErrors({}); }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="label">City *</label>
                    <input
                      type="text"
                      className={cn('input-base', errors.city && 'border-red-500')}
                      placeholder="Ex. Mumbai"
                      value={city}
                      onChange={e => { setCity(e.target.value); if (errors.city) setErrors({}); }}
                    />
                  </div>
                  <div>
                    <label className="label">State *</label>
                    <input
                      type="text"
                      className={cn('input-base', errors.state && 'border-red-500')}
                      placeholder="Ex. MH"
                      value={state}
                      onChange={e => { setState(e.target.value); if (errors.state) setErrors({}); }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Tickets */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Capacity & Admission Setup</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Determine maximum seats and pricing structures.</p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddTier}>Add Tier</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-gray-50/50 dark:bg-gray-900/10 p-4 rounded-xl border">
                  <div>
                    <label className="label font-bold">Overall Event Seat Capacity *</label>
                    <input
                      type="number"
                      className={cn('input-base text-sm font-semibold', errors.capacity && 'border-red-500')}
                      min={1}
                      value={capacity}
                      onChange={e => { setCapacity(Number(e.target.value)); if (errors.capacity || errors.capacityLimit) setErrors({}); }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 pb-2">
                    Ensure the sum of all ticket tier seats does not exceed this total capacity.
                  </div>
                </div>
                {errors.capacity && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.capacity}</p>}
                {errors.capacityLimit && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.capacityLimit}</p>}

                {/* Ticket tiers mapping */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                  {ticketTiers.map((tier, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 relative bg-gray-50/20 dark:bg-transparent">
                      {ticketTiers.length > 1 && (
                        <button type="button" onClick={() => handleRemoveTier(idx)} className="absolute top-4 right-4 text-red-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Tier Name</label>
                          <input
                            type="text"
                            className={cn('input-base text-xs py-1.5', errors[`tierName_${idx}`] && 'border-red-500')}
                            value={tier.name}
                            onChange={e => handleTierChange(idx, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Ticket Type</label>
                          <select
                            className="input-base text-xs py-1.5"
                            value={tier.type}
                            onChange={e => {
                              const type = e.target.value;
                              handleTierChange(idx, 'type', type);
                              if (type === 'FREE') handleTierChange(idx, 'price', 0);
                            }}
                          >
                            {['GENERAL', 'VIP', 'FREE', 'STUDENT'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Admission Price (₹)</label>
                          <input
                            type="number"
                            className={cn('input-base text-xs py-1.5', errors[`tierPrice_${idx}`] && 'border-red-500')}
                            min={0}
                            disabled={tier.type === 'FREE'}
                            value={tier.price}
                            onChange={e => handleTierChange(idx, 'price', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Tier Capacity</label>
                          <input
                            type="number"
                            className={cn('input-base text-xs py-1.5', errors[`tierQuantity_${idx}`] && 'border-red-500')}
                            min={1}
                            value={tier.quantity}
                            onChange={e => { handleTierChange(idx, 'quantity', Number(e.target.value)); if (errors.capacityLimit) setErrors({}); }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Short Description</label>
                          <input
                            type="text"
                            className="input-base text-xs py-1.5"
                            placeholder="Ex. Standard entry with main access"
                            value={tier.description || ''}
                            onChange={e => handleTierChange(idx, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Banner */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Cover Banner Image</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Add a visual landscape banner to attract more audience checkouts.</p>
                </div>

                {/* Drag-and-drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 transition-colors relative overflow-hidden',
                    isDragOver ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-900/10' : 'border-gray-200 dark:border-gray-800 hover:border-brand-300'
                  )}
                >
                  {bannerUrl ? (
                    <>
                      <img src={bannerUrl} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button type="button" size="sm" variant="secondary" leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} onClick={() => setBannerUrl('')}>Delete Banner</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2 animate-bounce" />
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Drag & drop files here, or click to browse</p>
                      <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, or WEBP landscape formats (max 5MB)</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={e => { if (e.target.files?.length) handleFile(e.target.files[0]); }}
                      />
                    </>
                  )}
                </div>

                {/* Unsplash Preset Carousel */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Or select category preset banner</span>
                  <div className="flex gap-2.5 overflow-x-auto py-2 no-scrollbar">
                    {Object.keys(CATEGORY_PRESETS).map(catName => {
                      const img = CATEGORY_PRESETS[catName];
                      const isSelected = bannerUrl === img;
                      return (
                        <button
                          type="button"
                          key={catName}
                          onClick={() => { setBannerUrl(img); if (errors.banner) setErrors({}); }}
                          className={cn(
                            'shrink-0 w-24 h-16 rounded-xl overflow-hidden relative border-2 transition-all hover:scale-105 duration-200',
                            isSelected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-transparent'
                          )}
                        >
                          <img src={img} alt={catName} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white tracking-tight">{catName}</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-brand-500 rounded-full p-0.5 text-white">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Preview */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Live Layout Preview</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Verify your design and content hierarchy.</p>
                </div>

                {/* Event Detail Mock Template Sandbox */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden bg-white dark:bg-gray-950 shadow-lg">
                  {/* Mock Hero Banner */}
                  <div className="relative h-44 bg-gradient-to-br from-brand-600 to-purple-800 flex items-center justify-center overflow-hidden">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Preview Banner" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl">{getCategoryIcon(category)}</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-6">
                      <Badge variant="brand" className="text-[9px] py-0.5 mb-1.5">{category}</Badge>
                      <h4 className="text-base font-black text-white leading-tight">{title || 'Untitled Experience'}</h4>
                    </div>
                  </div>

                  {/* Mock Content */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-500">
                    <div className="md:col-span-2 space-y-4">
                      {/* Grid metrics */}
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="p-2 border rounded-xl flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-brand-500" />
                          <div>
                            <p className="text-[8px] text-gray-400 font-bold uppercase">Date</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{startDate ? formatDate(startDate) : 'Not set'}</p>
                          </div>
                        </div>
                        <div className="p-2 border rounded-xl flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-violet-500" />
                          <div>
                            <p className="text-[8px] text-gray-400 font-bold uppercase">Time</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{startTime} – {endTime}</p>
                          </div>
                        </div>
                        <div className="p-2 border rounded-xl flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <div className="min-w-0">
                            <p className="text-[8px] text-gray-400 font-bold uppercase">Location</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{city || 'Not set'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <h5 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[10px]">About</h5>
                        <p className="leading-relaxed text-gray-600 dark:text-gray-300 line-clamp-3">{description || 'No description provided'}</p>
                      </div>
                    </div>

                    {/* Booking sidebar mock */}
                    <div className="p-4 border rounded-2xl bg-gray-50 dark:bg-gray-900/50 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3 pb-2 border-b">
                          <div>
                            <span className="text-[8px] text-gray-400 uppercase font-bold">cheapest</span>
                            <p className="text-sm font-black text-brand-500">{ticketTiers.length > 0 ? formatCurrency(Math.min(...ticketTiers.map(t => t.price))) : 'Free'}</p>
                          </div>
                          <Badge variant="success" className="text-[8px]">{capacity} seats</Badge>
                        </div>
                        <div className="space-y-1">
                          {ticketTiers.slice(0, 2).map((t, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px]">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[80px]">{t.name}</span>
                              <span className="font-bold text-brand-500">{formatCurrency(t.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button type="button" size="sm" className="w-full text-[10px] mt-4 py-1" disabled>Book Pass</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Publish / Update */}
            {step === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">{isEditMode ? 'Update Event' : 'Publish Event'}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{isEditMode ? 'Save your changes to the event.' : 'Launch your experience directly or save it as a draft for later modifications.'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option Draft / Save */}
                  <button
                    type="button"
                    onClick={() => createEventMutation.mutate({ status: 'DRAFT' })}
                    disabled={createEventMutation.isPending}
                    className="p-5 border rounded-2xl text-left hover:border-brand-500 bg-gray-50/50 dark:bg-transparent transition-all group flex flex-col justify-between min-h-[140px]"
                  >
                    <div>
                      <Badge variant="default" className="text-[8px] uppercase font-bold mb-2">{isEditMode ? 'Option A' : 'Option A'}</Badge>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-brand-500 transition-colors">{isEditMode ? 'Save as Draft' : 'Save as Draft'}</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{isEditMode ? 'Save changes and keep the event as a draft.' : 'Save all specifications. You can publish this campaign at any time in the My Events dashboard.'}</p>
                    </div>
                    <span className="text-xs font-bold text-brand-500 flex items-center gap-1 mt-4">{isEditMode ? 'Save Changes' : 'Save Draft'} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
                  </button>

                  {/* Option Publish / Update */}
                  <button
                    type="button"
                    onClick={() => createEventMutation.mutate({ status: 'PUBLISHED' })}
                    disabled={createEventMutation.isPending}
                    className="p-5 border rounded-2xl text-left hover:border-brand-500 bg-gray-50/50 dark:bg-transparent transition-all group flex flex-col justify-between min-h-[140px] border-brand-200 dark:border-brand-900/30"
                  >
                    <div>
                      <Badge variant="brand" className="text-[8px] uppercase font-bold mb-2">Option B</Badge>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-brand-500 transition-colors">{isEditMode ? 'Update & Publish' : 'Publish Instantly'}</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{isEditMode ? 'Save changes and publish the event immediately. Attendees will be notified of any schedule changes.' : 'Launch campaign now. The event will appear immediately on the Explore Discovery board for bookings.'}</p>
                    </div>
                    <span className="text-xs font-bold text-brand-500 flex items-center gap-1 mt-4">{isEditMode ? 'Update Now' : 'Publish Now'} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Stepper Navigation actions footer */}
        {step < 6 && (
          <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-5 mt-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={step === 1}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={handlePrev}
            >
              Back
            </Button>

            <Button
              type="button"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={handleNext}
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
