import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MapPin, Bus, Building2, ShoppingBag,
         Stethoscope, GraduationCap, Hotel, UtensilsCrossed, Fuel,
         Home, Route } from 'lucide-react';
import mapService from '../../services/mapService';
import { Spinner } from '../Common/Loading';

const CATEGORY_ICONS = {
  bus_stop:    <Bus              className="w-3 h-3 text-yellow-400" />,
  building:    <Building2        className="w-3 h-3 text-blue-400"   />,
  apartment:   <Building2        className="w-3 h-3 text-blue-400"   />,
  house:       <Home             className="w-3 h-3 text-emerald-400"/>,
  street:      <Route            className="w-3 h-3 text-slate-300"  />,
  hospital:    <Stethoscope      className="w-3 h-3 text-blue-400"   />,
  school:      <GraduationCap    className="w-3 h-3 text-purple-400" />,
  university:  <GraduationCap    className="w-3 h-3 text-purple-400" />,
  hotel:       <Hotel            className="w-3 h-3 text-pink-400"   />,
  restaurant:  <UtensilsCrossed  className="w-3 h-3 text-red-400"    />,
  cafe:        <UtensilsCrossed  className="w-3 h-3 text-amber-400"  />,
  fuel:        <Fuel             className="w-3 h-3 text-yellow-500" />,
  shop:        <ShoppingBag      className="w-3 h-3 text-orange-400" />,
  default:     <MapPin           className="w-3 h-3 text-slate-400"  />,
};

const useDebounce = (fn, delay) => {
  const timerRef = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

const SearchBox = ({
  placeholder = 'Search places, buildings, bus stops...',
  onSelect,
  value: externalValue = '',
  label,
  icon,
  className = '',
}) => {
  const [query,   setQuery]   = useState(externalValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [errored, setErrored] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0); // keyboard-highlighted result
  const inputRef     = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => { setQuery(externalValue); }, [externalValue]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const performSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setErrored(false);
      return;
    }
    setLoading(true);
    setErrored(false);
    // Geocoding is tried in order of reliability:
    //   1. Backend autocomplete proxy  — server-side Photon→Nominatim, no
    //      browser CORS, sets a valid User-Agent, friendlier to rate limits.
    //   2. Direct Photon (browser)     — fast but flaky / rate-limited.
    //   3. Direct Nominatim (browser)  — last resort.
    // Both schedule (pickup/dropoff) and ride search (from/to) depend on this
    // box returning lat/lng, so a single robust path fixes both surfaces.
    const sources = [
      async () => {
        const data = await mapService.autocomplete(q);
        return (data.results || []).map((r) => ({
          id:       r.id,
          name:     r.name || (r.display || '').split(',')[0] || '',
          display:  r.display || r.name || '',
          lat:      r.lat,
          lng:      r.lng,
          category: r.category || 'address',
        }));
      },
      async () => mapService.photonSearch(q, null, null, 8),
      async () => {
        const nom = await mapService.nominatimSearch(q, 8);
        return nom.map((r) => ({
          id:       r.place_id,
          name:     (r.display_name || '').split(',')[0] || '',
          display:  r.display_name || '',
          lat:      parseFloat(r.lat),
          lng:      parseFloat(r.lon),
          category: r.class || 'address',
        }));
      },
    ];

    let res = [];
    let lastErr = null;
    for (const fetchFrom of sources) {
      try {
        const out = await fetchFrom();
        // Keep only results that actually carry coordinates — a result with
        // no lat/lng is useless to the schedule/search forms downstream.
        res = (out || []).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
        if (res.length) break;
      } catch (err) {
        lastErr = err;
      }
    }

    setResults(res.slice(0, 8));
    setActiveIdx(0);
    setOpen(res.length > 0);
    setErrored(res.length === 0 && lastErr != null);
    setLoading(false);
  }, []);

  const debouncedSearch = useDebounce(performSearch, 350);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    debouncedSearch(val);
  };

  // Keyboard support: ↑/↓ to move, Enter to pick the highlighted (first by
  // default) result, Esc to close. preventDefault on Enter stops the
  // surrounding form (e.g. Schedule Ride) from submitting.
  const handleKeyDown = (e) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[activeIdx] || results[0];
      if (pick) handleSelect(pick);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (result) => {
    const location = {
      lat:      result.lat,
      lng:      result.lng,
      address:  result.display || result.name,
      name:     result.name,
      category: result.category,
    };
    setQuery(result.display || result.name);
    setOpen(false);
    setResults([]);
    onSelect && onSelect(location);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
    onSelect && onSelect(null);
  };

  const getCategoryIcon = (cat = '') => {
    const c = cat.toLowerCase();
    // Direct hits first
    if (CATEGORY_ICONS[c]) return CATEGORY_ICONS[c];
    if (c.includes('bus'))                                 return CATEGORY_ICONS.bus_stop;
    if (c.includes('hospital') || c.includes('clinic'))    return CATEGORY_ICONS.hospital;
    if (c.includes('school') || c.includes('college'))     return CATEGORY_ICONS.school;
    if (c.includes('hotel') || c.includes('hostel'))       return CATEGORY_ICONS.hotel;
    if (c.includes('restaurant') || c.includes('cafe') ||
        c.includes('fast_food') || c.includes('bar'))      return CATEGORY_ICONS.restaurant;
    if (c.includes('fuel') || c.includes('petrol'))        return CATEGORY_ICONS.fuel;
    if (c.includes('apartments') || c.includes('residential')) return CATEGORY_ICONS.apartment;
    if (c.includes('house'))                               return CATEGORY_ICONS.house;
    if (c.includes('street') || c.includes('road') ||
        c.includes('highway'))                             return CATEGORY_ICONS.street;
    if (c.includes('building') || c.includes('office'))    return CATEGORY_ICONS.building;
    if (c.includes('shop') || c.includes('store'))         return CATEGORY_ICONS.shop;
    return CATEGORY_ICONS.default;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-medium aumo-text-subtle mb-1">{label}</label>
      )}
      <div className="relative flex items-center">
        <div className="absolute left-3 aumo-text-subtle pointer-events-none">
          {icon || <Search className="w-4 h-4" />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-10 pr-10 py-3 rounded-xl text-sm
                     aumo-bg-input aumo-text-primary placeholder:aumo-text-subtle
                     border aumo-border
                     focus:border-green-500/50 focus:outline-none
                     focus:ring-1 focus:ring-green-500/30
                     transition-all"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {loading && <Spinner size="sm" />}
          {query && !loading && (
            <button
              onClick={handleClear}
              type="button"
              className="aumo-text-subtle hover:aumo-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {errored && !loading && query.trim().length >= 2 && (
        <p className="mt-1 text-xs text-amber-500">
          Couldn't reach the location service. Check your connection and try again.
        </p>
      )}

      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-50
                     border border-white/10 rounded-xl shadow-2xl
                     overflow-hidden max-h-64 overflow-y-auto"
          style={{
            background: '#1e293b',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          {results.map((result, i) => (
            <button
              key={`${result.id || i}_${i}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIdx(i)}
              type="button"
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                          border-b aumo-border last:border-0
                          ${i === activeIdx ? 'bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {getCategoryIcon(result.category || '')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium aumo-text-primary truncate">
                  {result.name || (result.display || '').split(',')[0]}
                </p>
                {result.display && result.display !== result.name && (
                  <p className="text-xs aumo-text-muted truncate mt-0.5">
                    {result.display}
                  </p>
                )}
              </div>
              {result.category && (
                <span className="flex-shrink-0 text-xs aumo-text-subtle capitalize mt-0.5">
                  {(result.category || '').replace('_', ' ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBox;