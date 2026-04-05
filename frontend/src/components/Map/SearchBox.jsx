import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MapPin, Navigation, Building2, ShoppingBag, Bus } from 'lucide-react';
import mapService from '../../services/mapService';
import { debounce } from '../../utils/helpers';
import { Spinner } from '../Common/Loading';

const CATEGORY_ICONS = {
  bus_stop:  <Bus  className="w-3 h-3 text-yellow-400" />,
  building:  <Building2 className="w-3 h-3 text-blue-400" />,
  shop:      <ShoppingBag className="w-3 h-3 text-orange-400" />,
  address:   <MapPin className="w-3 h-3 text-green-400" />,
  default:   <MapPin className="w-3 h-3 text-slate-400" />,
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
  const inputRef  = useRef(null);
  const containerRef = useRef(null);

  // Sync external value
  useEffect(() => { setQuery(externalValue); }, [externalValue]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(
    debounce(async (q) => {
      if (!q || q.trim().length < 2) { setResults([]); setOpen(false); return; }
      setLoading(true);
      try {
        // Try Photon first (faster), fall back to Nominatim
        let res = [];
        try {
          res = await mapService.photonSearch(q, null, null, 8);
        } catch {
          const nom = await mapService.nominatimSearch(q, 8);
          res = nom.map((r) => ({
            id:       r.place_id,
            name:     r.display_name?.split(',')[0] || '',
            display:  r.display_name || '',
            lat:      parseFloat(r.lat),
            lng:      parseFloat(r.lon),
            category: r.class || 'address',
            type:     r.type,
          }));
        }
        setResults(res.slice(0, 8));
        setOpen(res.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350),
    []
  );

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  };

  const handleSelect = (result) => {
    const location = {
      lat:     result.lat,
      lng:     result.lng,
      address: result.display || result.name,
      name:    result.name,
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
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      )}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400">
          {icon || <Search className="w-4 h-4" />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 glass rounded-xl
                     text-white placeholder-slate-500 text-sm
                     border border-white/10 focus:border-primary-500/50
                     focus:outline-none focus:ring-1 focus:ring-primary-500/30
                     transition-all"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {loading && <Spinner size="sm" />}
          {query && !loading && (
            <button onClick={handleClear} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[9999]
                        glass border border-white/10 rounded-xl shadow-2xl
                        overflow-hidden animate-fade-in max-h-72 overflow-y-auto">
          {results.map((result, i) => (
            <button
              key={`${result.id}_${i}`}
              onClick={() => handleSelect(result)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left
                         hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="mt-0.5 flex-shrink-0">
                {getCategoryIcon(result.category)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {result.name || result.display?.split(',')[0]}
                </p>
                {result.display && result.display !== result.name && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {result.display}
                  </p>
                )}
              </div>
              {result.category && (
                <span className="flex-shrink-0 text-xs text-slate-500 capitalize mt-0.5">
                  {result.category.replace('_', ' ')}
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