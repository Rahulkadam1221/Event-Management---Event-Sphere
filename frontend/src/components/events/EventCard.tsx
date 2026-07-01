import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { Event } from '../../types';
import { Badge } from '../ui/Badge';
import { formatDate, formatCurrency, truncateText, getCategoryIcon } from '../../lib/utils';

interface EventCardProps {
  event: Event;
  index?: number;
}

export const EventCard: React.FC<EventCardProps> = ({ event, index = 0 }) => {
  const minPrice = event.ticketTiers.length > 0
    ? Math.min(...event.ticketTiers.map(t => t.price))
    : 0;

  const availabilityPct = event.capacity > 0 ? ((event.capacity - event.availableSeats) / event.capacity) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link to={`/events/${event.id}`} className="group block card overflow-hidden hover:shadow-lg transition-all duration-300">
        {/* Banner */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/30 dark:to-violet-900/30">
          {event.bannerUrl ? (
            <img
              src={event.bannerUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl">{getCategoryIcon(event.category)}</span>
            </div>
          )}
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            {event.isFeatured && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-900">⭐ Featured</span>
            )}
            {event.isTrending && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white">🔥 Trending</span>
            )}
          </div>
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300">
              {getCategoryIcon(event.category)} {event.category}
            </span>
          </div>
          {/* Price tag */}
          <div className="absolute bottom-3 right-3">
            <span className="px-3 py-1.5 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-md">
              {formatCurrency(minPrice)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display font-bold text-gray-900 dark:text-white text-base leading-snug mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {truncateText(event.title, 60)}
          </h3>

          {event.shortDesc && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
              {truncateText(event.shortDesc, 80)}
            </p>
          )}

          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span>{formatDate(event.startDate)} · {event.startTime}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{truncateText(`${event.venue}, ${event.city}`, 40)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{event.availableSeats} seats left</span>
            </div>
          </div>

          {/* Availability bar */}
          <div className="mb-4">
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${availabilityPct}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 + 0.3 }}
                className={`h-full rounded-full ${availabilityPct > 80 ? 'bg-red-500' : availabilityPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {event.ticketTiers.slice(0, 2).map(tier => (
                <Badge key={tier.id} variant={tier.type === 'FREE' ? 'success' : tier.type === 'VIP' ? 'warning' : 'brand'}>
                  {tier.type}
                </Badge>
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-brand-500 group-hover:gap-2 transition-all duration-200">
              View <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
