import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, X, SlidersHorizontal, Grid3X3, List } from 'lucide-react';
import { api } from '../lib/axios';
import { Event, ApiResponse } from '../types';
import { PageWrapper } from '../components/layout/PageWrapper';
import { EventCard } from '../components/events/EventCard';
import { EventCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useDebounce } from '../hooks/useDebounce';

const CATEGORIES = ['Technology', 'Music', 'Design', 'Business', 'Food', 'Sports', 'Arts', 'Health', 'Education', 'Gaming'];
const SORT_OPTIONS = [
  { value: 'startDate', label: 'Date (Upcoming)' },
  { value: '-createdAt', label: 'Newest First' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
];

interface EventsQuery {
  data: ApiResponse<Event[]>;
}

export const EventsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  // Local inputs for filters that require debouncing
  const [localCity, setLocalCity] = useState(searchParams.get('city') || '');
  const [localMinPrice, setLocalMinPrice] = useState(searchParams.get('minPrice') || '');
  const [localMaxPrice, setLocalMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'startDate';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const city = searchParams.get('city') || '';
  const startDate = searchParams.get('startDate') || '';

  const debouncedCity = useDebounce(localCity, 500);
  const debouncedMinPrice = useDebounce(localMinPrice, 500);
  const debouncedMaxPrice = useDebounce(localMaxPrice, 500);

  const { data, isLoading, error } = useQuery<EventsQuery['data']>({
    queryKey: ['events', { category, search, sort, page, minPrice, maxPrice, city, startDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      if (page > 1) params.set('page', page.toString());
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (city) params.set('city', city);
      if (startDate) params.set('startDate', startDate);
      params.set('status', 'PUBLISHED');
      params.set('limit', '12');
      const { data } = await api.get(`/events?${params}`);
      return data;
    },
  });

  const updateParam = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  // Sync debounced fields with URL Search Params
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    if ((next.get('city') || '') !== debouncedCity) {
      if (debouncedCity) next.set('city', debouncedCity); else next.delete('city');
      changed = true;
    }
    if ((next.get('minPrice') || '') !== debouncedMinPrice) {
      if (debouncedMinPrice) next.set('minPrice', debouncedMinPrice); else next.delete('minPrice');
      changed = true;
    }
    if ((next.get('maxPrice') || '') !== debouncedMaxPrice) {
      if (debouncedMaxPrice) next.set('maxPrice', debouncedMaxPrice); else next.delete('maxPrice');
      changed = true;
    }

    if (changed) {
      next.delete('page');
      setSearchParams(next);
    }
  }, [debouncedCity, debouncedMinPrice, debouncedMaxPrice, searchParams, setSearchParams]);

  // Sync local inputs when URL search params are updated or cleared elsewhere
  useEffect(() => {
    setSearchInput(searchParams.get('search') || '');
    setLocalCity(searchParams.get('city') || '');
    setLocalMinPrice(searchParams.get('minPrice') || '');
    setLocalMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput('');
    setLocalCity('');
    setLocalMinPrice('');
    setLocalMaxPrice('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', searchInput);
  };

  const events: Event[] = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!(category || search || minPrice || maxPrice || city || startDate);

  return (
    <PageWrapper>
      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-50 dark:from-gray-950 to-transparent pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-4xl font-black text-gray-900 dark:text-white mb-3">
              Explore Events
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Discover {meta?.total || '10,000+'} events happening near you
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
              <div className="flex-1">
                <Input
                  placeholder="Search events, venues, organizers..."
                  leftIcon={<Search className="w-4 h-4" />}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>
              <Button type="submit" size="md">Search</Button>
              <Button
                type="button"
                variant={showFilters ? 'primary' : 'secondary'}
                size="md"
                leftIcon={<SlidersHorizontal className="w-4 h-4" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
            </form>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-6 mb-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 items-end">
              <div className="xl:col-span-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => updateParam('category', category === cat ? '' : cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        category === cat
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location / City</p>
                <input
                  type="text"
                  placeholder="Ex. Mumbai"
                  className="input-base w-full"
                  value={localCity}
                  onChange={e => setLocalCity(e.target.value)}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date (On/After)</p>
                <input
                  type="date"
                  className="input-base w-full"
                  value={startDate}
                  onChange={e => updateParam('startDate', e.target.value)}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Price Range (₹)</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    className="input-base w-full"
                    value={localMinPrice}
                    onChange={e => setLocalMinPrice(e.target.value)}
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="input-base w-full"
                    value={localMaxPrice}
                    onChange={e => setLocalMaxPrice(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sort By</p>
                <select
                  className="input-base"
                  value={sort}
                  onChange={e => updateParam('sort', e.target.value)}
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {hasFilters && (
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button variant="outline" size="sm" leftIcon={<X className="w-4 h-4" />} onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Active filter tags */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {category && <Badge variant="brand" className="cursor-pointer" onClick={() => updateParam('category', '')}>{category} <X className="w-3 h-3 ml-1" /></Badge>}
            {search && <Badge variant="info" className="cursor-pointer" onClick={() => { updateParam('search', ''); setSearchInput(''); }}>Search: {search} <X className="w-3 h-3 ml-1" /></Badge>}
            {city && <Badge variant="default" className="cursor-pointer" onClick={() => updateParam('city', '')}>City: {city} <X className="w-3 h-3 ml-1" /></Badge>}
            {startDate && <Badge variant="success" className="cursor-pointer" onClick={() => updateParam('startDate', '')}>Date: {startDate} <X className="w-3 h-3 ml-1" /></Badge>}
            {(minPrice || maxPrice) && <Badge variant="warning">₹{minPrice || '0'} - ₹{maxPrice || '∞'}</Badge>}
          </div>
        )}

        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? 'Loading...' : `${meta?.total || events.length} events found`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Events grid */}
        {error ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">😞</p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Failed to load events. Please try again.</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : isLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[...Array(9)].map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-2">No events found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or search terms</p>
            <Button onClick={clearFilters} variant="secondary">Clear Filters</Button>
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {events.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <Button
              variant="secondary"
              size="sm"
              disabled={!meta.hasPrev}
              onClick={() => updateParam('page', (page - 1).toString())}
            >
              Previous
            </Button>
            {[...Array(meta.totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => updateParam('page', (i + 1).toString())}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${
                  page === i + 1
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            )).slice(Math.max(0, page - 3), page + 2)}
            <Button
              variant="secondary"
              size="sm"
              disabled={!meta.hasNext}
              onClick={() => updateParam('page', (page + 1).toString())}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};
