import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MapPin, Bus, Building2, ShoppingBag } from 'lucide-react';
import mapService from '../../services/mapService';
import { Spinner } from '../Common/Loading';

const CATEGORY_ICONS = {
  bus_stop: <Bus       className="w-3 h-3 text-yellow-400" />,
  building: <Building2 className="w-3 h-3 text-blue-400"  />,
  shop:     <ShoppingBag className="w-3 h-3 text-orange-400" />,
  default:  <MapPin    className="w-3 h-3 text-slate-400"  />,
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
      return;
    }
    setLoading(true);
    try {
      let res = [];
      try {
        res = await mapService.photonSearch(q, null, null, 8);
      } catch {
        const nom = await mapService.nominatimSearch(q, 8);
        res = nom.map((r) => ({
          id:       r.place_id,
          name:     (r.display_name || '').split(',')[0] || '',
          display:  r.display_name || '',
          lat:      parseFloat(r.lat),
          lng:      parseFloat(r.lon),
          category: r.class || 'address',
        }));
      }
      setResults(res.slice(0, 8));
      setOpen(res.length > 0);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useDebounce(performSearch, 350);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    debouncedSearch(val);
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
    if (cat.includes('bus') || cat === 'bus_stop') return CATEGORY_ICONS.bus_stop;
    if (cat.includes('building') || cat.includes('office')) return CATEGORY_ICONS.building;
    if (cat.includes('shop') || cat.includes('store')) return CATEGORY_ICONS.shop;
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

      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-50
                     border aumo-border aumo-bg-popover rounded-xl shadow-2xl
                     overflow-hidden max-h-64 overflow-y-auto"
        >
          {results.map((result, i) => (
            <button
              key={`${result.id || i}_${i}`}
              onClick={() => handleSelect(result)}
              type="button"
              className="w-full flex items-start gap-3 px-4 py-3 text-left
                         hover:bg-black/5 dark:hover:bg-white/10 transition-colors
                         border-b aumo-border last:border-0"
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