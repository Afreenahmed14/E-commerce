import { useEffect, useRef, useState } from 'react';
import { FiMapPin, FiX } from 'react-icons/fi';
import './CitySearchInput.css';

/**
 * A typeahead over an already-loaded, country-scoped city list (the
 * profile-edit forms already fetch `getCityOptions(countryIso)` once the
 * country is picked, so — unlike CitySearchInput on Browse Engineers —
 * there's no need to re-search a worldwide dataset per keystroke here,
 * just filter the in-memory list).
 *
 * Supports full keyboard use: type to filter, Arrow Up/Down to move the
 * highlight, Enter to confirm the highlighted (or first-matching) city,
 * Escape to close without changing the value.
 */
export default function CityAutocomplete({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Search for a city…',
  disabledPlaceholder = 'Select a country first',
  onBlur,
  error,
}) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  useEffect(() => { setHighlight(0); }, [query, open]);

  useEffect(() => {
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [onBlur]);

  const pick = (city) => {
    setQuery(city);
    onChange(city);
    setOpen(false);
  };

  const clear = () => {
    setQuery('');
    onChange('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'Enter') {
      // Prevent the surrounding <form> from submitting on Enter — this key
      // press means "confirm this city", not "save the whole profile".
      e.preventDefault();
      if (open && filtered.length > 0) {
        pick(filtered[highlight]?.value ?? filtered[0].value);
      } else if (filtered.length === 1) {
        pick(filtered[0].value);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="city-search" ref={rootRef}>
      <div className={`city-search-input ${error ? 'form-input-error' : ''}`}>
        <FiMapPin />
        <input
          value={query}
          disabled={disabled}
          placeholder={disabled ? disabledPlaceholder : placeholder}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && !disabled && (
          <button type="button" className="city-search-clear" onClick={clear} aria-label="Clear city">
            <FiX size={14} />
          </button>
        )}
      </div>

      {open && !disabled && filtered.length > 0 && (
        <div className="city-search-panel">
          {filtered.map((o, i) => (
            <button
              type="button"
              key={o.value}
              className={`city-search-option ${i === highlight ? 'city-search-option-active' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(o.value)}
            >
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
