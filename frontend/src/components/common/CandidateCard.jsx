import { Link } from 'react-router-dom';
import { FiMapPin, FiBookmark, FiLock } from 'react-icons/fi';
import Card from './Card';
import Badge from './Badge';
import StarRating from './StarRating';

/**
 * The engineer card used both in the flat filtered grid and inside each
 * category shelf on Browse Engineers — kept as one component so the two
 * views can never drift out of sync with each other.
 */
export default function CandidateCard({ candidate: c, isCompany, bookmarking, onToggleBookmark }) {
  const isAvailable = c.availability && c.availability !== 'not-available';
  const experienceLabel = c.experience || c.experienceMonths
    ? `${c.experience || 0}y${c.experienceMonths ? ` ${c.experienceMonths}m` : ''} exp`
    : '';

  return (
    <div className="candidate-card-link">
      <Card hoverable className="candidate-card">
        {isCompany && (
          <button
            type="button"
            className={`candidate-bookmark-btn ${c.isBookmarked ? 'is-bookmarked' : ''}`}
            onClick={(e) => onToggleBookmark(e, c._id, c.isBookmarked)}
            disabled={bookmarking === c._id}
            aria-label={c.isBookmarked ? 'Remove bookmark' : 'Bookmark this engineer'}
            title={c.isBookmarked ? 'Remove bookmark' : 'Bookmark this engineer'}
          >
            <FiBookmark />
          </button>
        )}
        <div className="candidate-card-header">
          <img
            src={c.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (c.name || c.headline || 'E')}
            alt=""
            className="candidate-avatar"
          />
          <div className="candidate-header-info">
            <div className="candidate-name-row">
              <h3>{c.name || 'Engineer'}</h3>
              {c.availability && (
                <Badge variant={isAvailable ? 'success' : 'default'}>
                  <span className="candidate-availability-dot" /> {isAvailable ? 'Available' : 'Unavailable'}
                </Badge>
              )}
            </div>
            {c.headline && <p className="candidate-headline text-muted">{c.headline}</p>}
            {c.location?.city && (
              <span className="candidate-location text-muted">
                <FiMapPin size={12} /> {c.location.city}{c.location.country ? `, ${c.location.country}` : ''}
              </span>
            )}
          </div>
        </div>

        <p className="candidate-about text-muted">{c.about}</p>

        <div className="candidate-skills">
          {(c.skills || []).slice(0, 4).map((s) => <Badge key={s} variant="skill">{s}</Badge>)}
        </div>

        <div className="candidate-card-footer">
          <span className="candidate-rate">₹{c.hourlyRate}/Hour</span>
          <Link to={`/candidates/${c._id}`} className="btn btn-outline btn-sm">View Profile</Link>
        </div>

        <div className="candidate-rating-row">
          <StarRating value={c.rating} reviewsCount={c.reviewsCount || 0} size={13} />
          {experienceLabel && <span className="candidate-experience-label text-muted">{experienceLabel}</span>}
        </div>

        <Link to={`/candidates/${c._id}`} className="candidate-unlock-btn">
          <FiLock size={13} /> Unlock contact with a subscription
        </Link>
      </Card>
    </div>
  );
}
