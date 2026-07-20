import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { reviewService } from '../../services/reviewService';
import { useAlert } from '../../context/AlertContext';
import './ReviewForm.css';

/**
 * Inline star-rating + text review, submitted directly from a candidate's
 * profile page. Works for BOTH directions:
 *  - a company reviewing the engineer (`targetId` = candidateId)
 *  - an engineer reviewing a company (`targetId` = companyId)
 * `reviewerType` tells the API which field the target ID belongs to. Only
 * one review per (reviewer, subject) pair is allowed server-side, so this
 * renders an "already reviewed" summary instead once `existingReview` is set.
 */
export default function ReviewForm({ targetId, reviewerType, existingReview, targetLabel = 'this profile', onSubmitted }) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState(existingReview?.review || '');
  const [submitting, setSubmitting] = useState(false);
  const { showError } = useAlert();

  if (existingReview) {
    return (
      <div className="review-form review-form-done">
        <p className="review-form-label">Your review</p>
        <div className="review-form-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <FiStar key={n} size={16} fill={n <= existingReview.rating ? 'currentColor' : 'none'} />
          ))}
        </div>
        {existingReview.review && <p className="text-muted">{existingReview.review}</p>}
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetId) return;
    if (!rating) {
      showError('Please select a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = reviewerType === 'company'
        ? { candidateId: targetId, rating, review: text }
        : { companyId: targetId, rating, review: text };
      const res = await reviewService.create(payload);
      onSubmitted?.(res.data.review);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <p className="review-form-label">Leave a review for {targetLabel}</p>
      <div className="review-form-stars review-form-stars-input">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            className="review-star-btn"
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <FiStar size={20} fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <textarea
        className="review-form-textarea"
        placeholder="Share your experience (optional)"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !targetId}>
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
