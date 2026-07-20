import { useEffect, useRef, useState } from 'react';
import { FiMapPin, FiX } from 'react-icons/fi';
import { searchCities, preloadCities } from '../../utils/locationData';
import './CitySearchInput.css';

/**
 * A free-text "search by city" box with a live worldwide typeahead —
 * used on Browse Engineers, where (unlike the profile-edit forms) there's
 * no country already selected to scope the city list to. Typing filters
 * the full country-state-city dataset and suggests matches as you go;
 * picking one fills the box, but the raw typed text is still what's sent
 * to the search (the backend already does a case-insensitive partial
 * match), so partial city names work even without picking a suggestion.
 */
export default function CitySearchInput({ value, onChange, placeholder = 'Search by city…' }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const requestId = useRef(0);

  // Kick off the (one-time, cached) worldwide city load as soon as this
  // field mounts, rather than waiting for the first keystroke — so the
  // first search a person types doesn't stall on loading the dataset.
  useEffect(() => { preloadCities(); }, []);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const id = ++requestId.current;
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCities(query, 8);
      if (requestId.current === id) setSuggestions(results);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    onChange(next);
  };

  const pickSuggestion = (s) => {
    setQuery(s.city);
    onChange(s.city);
    setOpen(false);
  };

  const clear = () => {
    setQuery('');
    onChange('');
    setOpen(false);
  };

  return (
    <div className="city-search" ref={rootRef}>
      <div className="city-search-input">
        <FiMapPin />
        <input
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button type="button" className="city-search-clear" onClick={clear} aria-label="Clear city">
            <FiX size={14} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="city-search-panel">
          {suggestions.map((s) => (
            <button
              type="button"
              key={`${s.city}-${s.country}`}
              className="city-search-option"
              onClick={() => pickSuggestion(s)}
            >
              <span>{s.city}</span>
              <span className="text-muted city-search-country">{s.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
