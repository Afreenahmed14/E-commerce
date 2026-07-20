import { FiStar } from 'react-icons/fi';
import './StarRating.css';

/**
 * Renders a 5-star row for a candidate/company rating, filling stars
 * proportionally (so a 3.5 shows a half-filled 4th star) rather than just
 * printing the raw number next to a single icon.
 */
export default function StarRating({ value = 0, reviewsCount, size = 14, showValue = true }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <span className="star-rating">
      <span className="star-rating-stars" style={{ '--star-size': `${size}px` }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const fillPct = Math.max(0, Math.min(1, rating - (n - 1))) * 100;
          return (
            <span key={n} className="star-rating-star">
              <FiStar size={size} className="star-rating-star-base" />
              <span className="star-rating-star-fill" style={{ width: `${fillPct}%` }}>
                <FiStar size={size} fill="currentColor" />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && <span className="star-rating-value">{rating ? rating.toFixed(1) : '—'}</span>}
      {reviewsCount !== undefined && (
        <span className="star-rating-count text-muted">({reviewsCount} review{reviewsCount === 1 ? '' : 's'})</span>
      )}
    </span>
  );
}
