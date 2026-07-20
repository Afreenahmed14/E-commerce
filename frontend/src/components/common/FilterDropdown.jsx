import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiX } from 'react-icons/fi';
import './FilterDropdown.css';

/**
 * A single filter "pill" for a horizontal filter bar (Flipkart/Amazon-style
 * listing filters): a button showing the filter's label — plus a short
 * summary once it has a value — that reveals a floating panel of controls
 * when clicked. Any filter UI (range inputs, a radio list, a search box)
 * can be passed as children.
 */
export default function FilterDropdown({ label, summary, active, onClear, children, panelClassName = '', modal = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (modal) return; // modal closes only via its own backdrop/close button
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [modal]);

  // Lock page scroll while the centered modal is open so it doesn't feel
  // like it's floating over a scrollable page behind it.
  useEffect(() => {
    if (!modal) return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [modal, open]);

  return (
    <div className="filter-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`filter-pill ${active ? 'is-active' : ''} ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="filter-pill-label">
          {label}
          {summary && <span className="filter-pill-summary">{summary}</span>}
        </span>
        {active && onClear ? (
          <span
            className="filter-pill-clear"
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClear(); } }}
            aria-label={`Clear ${label} filter`}
          >
            <FiX size={12} />
          </span>
        ) : (
          <FiChevronDown className={`filter-pill-caret ${open ? 'is-open' : ''}`} size={14} />
        )}
      </button>

      {open && modal && (
        <div className="filter-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className={`filter-modal-panel ${panelClassName}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="filter-modal-header">
              <h3>{label}</h3>
              <button
                type="button"
                className="filter-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="filter-modal-body">{children}</div>

            <div className="filter-modal-footer">
              {active && onClear ? (
                <button
                  type="button"
                  className="filter-modal-clear"
                  onClick={() => onClear()}
                >
                  Clear all
                </button>
              ) : <span />}
              <button
                type="button"
                className="filter-modal-apply"
                onClick={() => setOpen(false)}
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}

      {open && !modal && <div className={`filter-dropdown-panel ${panelClassName}`.trim()}>{children}</div>}
    </div>
  );
}
