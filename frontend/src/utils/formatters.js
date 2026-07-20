/** Formats a smallest-currency-unit integer (e.g. paise) into a display string. */
export const formatCurrency = (amountInSmallestUnit, currency = 'INR') => {
  const amount = amountInSmallestUnit / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

export const formatRelativeTime = (dateString) => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

/** Converts an ISO date string (or null) to the yyyy-mm-dd format <input type="date"> expects. */
export const toDateInputValue = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

/** Converts an ISO date string (or null) to the yyyy-MM-ddTHH:mm format <input type="datetime-local"> expects. */
export const toDateTimeInputValue = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Hours between two date/datetime strings, or null if either is missing/invalid. */
export const hoursBetween = (start, end) => {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;
  return Math.round(((endMs - startMs) / (1000 * 60 * 60)) * 10) / 10;
};

export const truncate = (text, maxLength = 120) =>
  text && text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
