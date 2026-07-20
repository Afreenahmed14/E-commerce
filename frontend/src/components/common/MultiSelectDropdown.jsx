import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiX, FiSearch, FiPlus } from 'react-icons/fi';
import './MultiSelectDropdown.css';

/**
 * A searchable "pick N of these" dropdown. Selected items render as
 * removable chips above the trigger; the panel below is a checklist you
 * can filter by typing. Options can be plain strings or { value, label }.
 *
 * Used for Primary/Secondary Skills and Speaking Languages, where a plain
 * free-text input would let people type anything and made filtering
 * unreliable — a fixed, searchable list keeps values consistent.
 *
 * When allowCustom is set, the existing picklist is still shown and
 * searched first (so people pick from the taxonomy whenever possible),
 * but if nothing matches what they typed, an "Add <query>" row lets them
 * add it anyway — for skills the taxonomy doesn't have yet.
 */
export default function MultiSelectDropdown({
  label,
  options,
  value = [],
  onChange,
  placeholder = 'Search…',
  error,
  required,
  emptyMessage = 'No options found',
  allowCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const filtered = query
    ? normalized.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalized;

  const trimmedQuery = query.trim();
  const hasExactMatch = normalized.some((o) => o.label.toLowerCase() === trimmedQuery.toLowerCase());
  const showAddCustom = allowCustom && trimmedQuery && !hasExactMatch;

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleValue = (val) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const removeChip = (val, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
  };

  const addCustom = () => {
    if (!trimmedQuery || value.includes(trimmedQuery)) return;
    onChange([...value, trimmedQuery]);
    setQuery('');
  };

  const labelFor = (val) => normalized.find((o) => o.value === val)?.label || val;

  return (
    <div className="form-field" ref={rootRef}>
      {label && (
        <label className="form-label">
          {label}{required && <span className="ms-required">*</span>}
        </label>
      )}

      <div className={`ms-control ${error ? 'form-input-error' : ''}`} onClick={() => setOpen((o) => !o)}>
        <div className="ms-chips">
          {value.length === 0 && <span className="ms-placeholder">Select…</span>}
          {value.map((v) => (
            <span key={v} className="ms-chip">
              {labelFor(v)}
              <button type="button" className="ms-chip-remove" onClick={(e) => removeChip(v, e)} aria-label={`Remove ${labelFor(v)}`}>
                <FiX size={12} />
              </button>
            </span>
          ))}
        </div>
        <FiChevronDown className={`ms-caret ${open ? 'ms-caret-open' : ''}`} />
      </div>

      {open && (
        <div className="ms-panel">
          <div className="ms-search">
            <FiSearch size={14} />
            <input
              autoFocus
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="ms-list">
            {filtered.length === 0 && !showAddCustom && <div className="ms-empty">{emptyMessage}</div>}
            {filtered.map((o) => (
              <label key={o.value} className="ms-option" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={value.includes(o.value)}
                  onChange={() => toggleValue(o.value)}
                />
                {o.label}
              </label>
            ))}
            {showAddCustom && (
              <button
                type="button"
                className="ms-add-custom"
                onClick={(e) => { e.stopPropagation(); addCustom(); }}
              >
                <FiPlus size={14} /> Add “{trimmedQuery}”
              </button>
            )}
          </div>
        </div>
      )}

      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
