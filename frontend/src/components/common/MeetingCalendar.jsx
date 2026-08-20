import { useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './MeetingCalendar.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  // 08:00 through 17:30, in 30-minute steps — a normal working-day window.
  const totalMinutes = 8 * 60 + i * 30;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
});

const sameDay = (a, b) => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

/**
 * A small self-contained month calendar (date grid) plus a time-slot row,
 * used by both the company's "Schedule Interview" flow and the
 * candidate's "Schedule Partner Meeting" flow. Reports the picked
 * date+time back as a Date object via onChange.
 */
export default function MeetingCalendar({ value, onChange }) {
  const initial = value ? new Date(value) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(() => {
    const base = initial && !Number.isNaN(initial.getTime()) ? initial : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(
    initial && !Number.isNaN(initial.getTime()) ? initial : null
  );
  const [selectedTime, setSelectedTime] = useState(() => {
    if (!initial || Number.isNaN(initial.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(initial.getHours())}:${pad(initial.getMinutes())}`;
  });

  const emitChange = (date, time) => {
    if (!date || !time) return;
    const [hh, mm] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hh, mm, 0, 0);
    onChange?.(combined);
  };

  const handlePickDate = (date) => {
    setSelectedDate(date);
    emitChange(date, selectedTime);
  };

  const handlePickTime = (time) => {
    setSelectedTime(time);
    emitChange(selectedDate, time);
  };

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));

  const monthLabel = viewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="meeting-calendar">
      <div className="meeting-calendar-header">
        <button
          type="button"
          className="meeting-calendar-nav"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          aria-label="Previous month"
        >
          <FiChevronLeft />
        </button>
        <strong>{monthLabel}</strong>
        <button
          type="button"
          className="meeting-calendar-nav"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          aria-label="Next month"
        >
          <FiChevronRight />
        </button>
      </div>

      <div className="meeting-calendar-weekdays">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>

      <div className="meeting-calendar-grid">
        {cells.map((date, idx) => {
          if (!date) return <span key={`blank-${idx}`} className="meeting-calendar-cell empty" />;
          const isPast = date < today;
          const isSelected = selectedDate && sameDay(date, selectedDate);
          const isToday = sameDay(date, today);
          return (
            <button
              type="button"
              key={date.toISOString()}
              disabled={isPast}
              className={`meeting-calendar-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => handlePickDate(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="meeting-calendar-times">
        {TIME_SLOTS.map((t) => (
          <button
            type="button"
            key={t}
            className={`meeting-time-slot ${selectedTime === t ? 'selected' : ''}`}
            onClick={() => handlePickTime(t)}
            disabled={!selectedDate}
          >
            {t}
          </button>
        ))}
      </div>
      {!selectedDate && <p className="meeting-calendar-hint text-muted">Pick a date, then a time.</p>}
    </div>
  );
}
