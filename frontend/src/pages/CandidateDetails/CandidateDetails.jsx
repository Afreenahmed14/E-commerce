import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FiStar, FiMapPin, FiGithub, FiLinkedin, FiLock, FiExternalLink, FiBookmark, FiFileText, FiDownload, FiCheckCircle, FiUserPlus } from 'react-icons/fi';
import { asDownloadUrl } from '../../utils/fileUrl';
import { candidateService } from '../../services/candidateService';
import { reviewService } from '../../services/reviewService';
import { companyService } from '../../services/companyService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import StarRating from '../../components/common/StarRating';
import ReviewForm from '../../components/common/ReviewForm';
import SubscriptionModal from '../../components/common/SubscriptionModal';
import LoginRequiredModal from '../../components/common/LoginRequiredModal';
import { formatDate } from '../../utils/formatters';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';
import './CandidateDetails.css';

export default function CandidateDetails() {
  const { id } = useParams();
  const { isAuthenticated, role, user } = useAuth();
  const { showError, showSuccess } = useAlert();

  const [candidate, setCandidate] = useState(null);
  const [socialLocked, setSocialLocked] = useState(false);
  const [profileLocked, setProfileLocked] = useState(false);
  const [hireInfo, setHireInfo] = useState(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [viewLimitReached, setViewLimitReached] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [hiring, setHiring] = useState(false);
  const sidebarRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginRequired(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profileRes, reviewsRes] = await Promise.all([
        candidateService.getById(id),
        reviewService.getForCandidate(id),
      ]);
      setLoginRequired(false);
      setCandidate(profileRes.data.candidate);
      setSocialLocked(!!profileRes.data.socialLocked);
      setProfileLocked(!!profileRes.data.profileLocked);
      setHireInfo(profileRes.data.hire || null);
      setReviews(reviewsRes.data.reviews);
    } catch (err) {
      if (err.response?.status === 401) {
        setLoginRequired(true);
      } else if (err.response?.status === 402) {
        // Free plan's profile-view limit reached — prompt to subscribe
        // instead of rendering a blank/broken profile page.
        setViewLimitReached(true);
        setSubscriptionModalOpen(true);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  // Entrance animation for the sticky sidebar card.
  useEffect(() => {
    if (prefersReducedMotion() || loading || !sidebarRef.current) return;

    gsap.fromTo(
      sidebarRef.current,
      { opacity: 0, x: 24 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out', delay: 0.15 }
    );
  }, [loading]);

  const handleToggleBookmark = async () => {
    if (!candidate) return;
    setBookmarking(true);
    const next = !candidate.isBookmarked;
    setCandidate((prev) => ({ ...prev, isBookmarked: next }));
    try {
      if (next) {
        await companyService.bookmarkCandidate(candidate._id);
      } else {
        await companyService.removeBookmark(candidate._id);
      }
    } catch {
      setCandidate((prev) => ({ ...prev, isBookmarked: !next }));
    } finally {
      setBookmarking(false);
    }
  };

  const handleHire = async () => {
    if (!candidate) return;
    setHiring(true);
    try {
      const res = await candidateService.hire(candidate._id);
      setHireInfo({
        role: role === 'company' ? 'company' : 'project-partner',
        alreadyHired: true,
        hiredAt: res.data.hire.unlockDate,
      });
      showSuccess(res.message || 'Hired successfully.');
    } catch (err) {
      if (err.response?.status === 402) {
        showError(err.response?.data?.message || 'A paid subscription is required to hire.');
        setSubscriptionModalOpen(true);
      } else {
        showError(err.response?.data?.message || 'Could not complete hire.');
      }
    } finally {
      setHiring(false);
    }
  };

  if (loading) return <Loader fullPage label="Loading profile…" />;
  if (loginRequired) {
    return (
      <div className="container section">
        <LoginRequiredModal open onClose={() => window.history.back()} />
      </div>
    );
  }
  if (viewLimitReached) {
    return (
      <div className="container section">
        <p>You've reached the Free plan's limit of viewing 5 profiles. Upgrade to keep browsing full profiles.</p>
        <SubscriptionModal
          open={subscriptionModalOpen}
          onClose={() => setSubscriptionModalOpen(false)}
        />
      </div>
    );
  }
  if (!candidate) return <div className="container section"><p>Engineer not found.</p></div>;

  const isCompany = isAuthenticated && role === 'company';
  const isOwnProfile = isAuthenticated && role === 'candidate' && user?._id === candidate._id;

  const myReview = isCompany ? reviews.find((r) => r.companyId?._id === user?._id && r.reviewerType === 'company') : null;

  const handleReviewSubmitted = (review) => {
    setReviews((prev) => [{ ...review, companyId: { _id: user._id, companyName: user.companyName } }, ...prev]);
  };

  return (
    <div className="container section candidate-details-page">
      <div className="details-layout">
        <div className="details-main">
          <Card className="details-header-card">
            <img
              src={candidate.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${candidate.name || candidate.headline || 'F'}`}
              alt=""
              className="details-avatar"
            />
            <div>
              <h1>{candidate.name || 'Engineer'}</h1>
              {candidate.headline && <p className="text-muted details-headline">{candidate.headline}</p>}
              {candidate.location?.city && (
                <span className="details-location text-muted">
                  <FiMapPin size={14} /> {candidate.location.city}{candidate.location.country ? `, ${candidate.location.country}` : ''}
                  {candidate.location.remote && ' · Remote'}
                </span>
              )}
              <div className="details-rating">
                <StarRating value={candidate.rating} reviewsCount={candidate.reviewsCount} size={16} />
                {candidate.verificationStatus === 'verified' && <Badge variant="success">Verified</Badge>}
              </div>
            </div>
            <div className="details-rate-box">
              {!profileLocked && (
                <>
                  <span className="details-rate">₹{candidate.hourlyRate}</span>
                  <span className="text-muted">/hour</span>
                </>
              )}
              {isCompany && (
                <button
                  type="button"
                  className={`details-bookmark-btn ${candidate.isBookmarked ? 'is-bookmarked' : ''}`}
                  onClick={handleToggleBookmark}
                  disabled={bookmarking}
                >
                  <FiBookmark /> {candidate.isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
              )}
              {(isCompany || (isAuthenticated && role === 'candidate' && !isOwnProfile)) && (
                hireInfo?.alreadyHired ? (
                  <span className="details-hired-badge">
                    <FiCheckCircle /> Hired on {formatDate(hireInfo.hiredAt)}
                  </span>
                ) : (
                  <Button onClick={handleHire} disabled={hiring}>
                    <FiUserPlus /> {hiring ? 'Please wait…' : (isCompany ? 'Hire Now' : 'Get Project Partner')}
                  </Button>
                )
              )}
            </div>
          </Card>

          {profileLocked ? (
            <>
              <Card className="details-section">
                <h2>About</h2>
                <p>{candidate.about || 'No bio provided yet.'}</p>
              </Card>
              <Card className="details-section">
                <h2>Skills</h2>
                <div className="details-skills">
                  {(candidate.primarySkills?.length ? candidate.primarySkills : candidate.skills || []).map((s) => <Badge key={s}>{s}</Badge>)}
                  {candidate.secondarySkills?.map((s) => <Badge key={s} variant="default">{s}</Badge>)}
                </div>
              </Card>
              <Card className="details-section social-locked-note">
                <p className="text-muted unlock-note">
                  <FiLock /> {isCompany
                    ? 'Upgrade to a paid Company plan to view this engineer\'s full profile (rate, projects, education, reviews) and to hire them.'
                    : 'Full profiles are visible to fellow engineers with an active Candidate + Project Partner subscription — upgrade to view details and hire a project partner.'}
                </p>
                <Button fullWidth onClick={() => setSubscriptionModalOpen(true)}>
                  View Plans
                </Button>
              </Card>
            </>
          ) : (
          <>
          <Card className="details-section">
            <h2>About</h2>
            <p>{candidate.about || 'No bio provided yet.'}</p>
          </Card>

          <Card className="details-section">
            <h2>Skills</h2>
            {candidate.primarySkills?.length > 0 && (
              <>
                <p className="text-muted" style={{ marginBottom: 'var(--space-2)' }}>Primary</p>
                <div className="details-skills" style={{ marginBottom: 'var(--space-3)' }}>
                  {candidate.primarySkills.map((s) => <Badge key={s}>{s}</Badge>)}
                </div>
              </>
            )}
            {candidate.secondarySkills?.length > 0 && (
              <>
                <p className="text-muted" style={{ marginBottom: 'var(--space-2)' }}>Secondary</p>
                <div className="details-skills">
                  {candidate.secondarySkills.map((s) => <Badge key={s} variant="default">{s}</Badge>)}
                </div>
              </>
            )}
            {!candidate.primarySkills?.length && !candidate.secondarySkills?.length && (
              <div className="details-skills">
                {(candidate.skills || []).map((s) => <Badge key={s}>{s}</Badge>)}
              </div>
            )}
          </Card>

          {candidate.projects?.length > 0 && (
            <Card className="details-section">
              <h2>Projects</h2>
              {candidate.projects.map((p, i) => (
                <div key={i} className="project-item">
                  <h4>{p.title}</h4>
                  <p className="text-muted">{p.description}</p>
                  {p.techStack?.length > 0 && (
                    <div className="details-skills">
                      {p.techStack.map((t) => <Badge key={t} variant="default">{t}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {candidate.education?.length > 0 && (
            <Card className="details-section">
              <h2>Education</h2>
              {candidate.education.map((e, i) => (
                <div key={i} className="edu-item">
                  <strong>{e.degree}</strong>
                  <span className="text-muted"> — {e.institution} ({e.startYear}–{e.endYear || 'Present'})</span>
                </div>
              ))}
            </Card>
          )}

          <Card className="details-section">
            <h2>Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="text-muted">No reviews yet.</p>
            ) : (
              reviews.map((r) => (
                <div key={r._id} className="review-item">
                  <div className="review-header">
                    <strong>{r.companyId?.companyName || 'Company'}</strong>
                    <span className="review-stars"><FiStar size={14} /> {r.rating}</span>
                    <span className="text-muted review-date">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.review && <p>{r.review}</p>}
                </div>
              ))
            )}
            {isCompany && !isOwnProfile && (
              <ReviewForm
                targetId={candidate._id}
                reviewerType="company"
                existingReview={myReview}
                targetLabel={candidate.name || candidate.headline || 'this engineer'}
                onSubmitted={handleReviewSubmitted}
              />
            )}
          </Card>
          </>
          )}
        </div>

        <aside className="details-sidebar" ref={sidebarRef}>
          {profileLocked ? null : (
          <>
          {candidate.resume && (
            <Card className="unlock-card">
              <a
                href={asDownloadUrl(candidate.resume, `${candidate.name || 'candidate'}-resume.pdf`)}
                className="social-link"
                style={{ justifyContent: 'center' }}
              >
                <FiDownload /> Download Resume
              </a>
            </Card>
          )}
          {!candidate.resume && isCompany && (
            <Card className="unlock-card">
              <p className="text-muted" style={{ textAlign: 'center' }}>
                <FiFileText /> No resume uploaded yet
              </p>
            </Card>
          )}

          {socialLocked ? (
            <Card className="social-locked-note">
              <p className="text-muted unlock-note">
                <FiLock /> Portfolio, GitHub, and LinkedIn links are visible with an active subscription.
              </p>
              <Button fullWidth onClick={() => setSubscriptionModalOpen(true)}>
                View Plans
              </Button>
            </Card>
          ) : (
            <>
              {candidate.portfolioLinks?.map((link, i) => (
                <a key={link} href={link} target="_blank" rel="noreferrer" className="social-link">
                  <FiExternalLink /> {candidate.portfolioLinks.length > 1 ? `Portfolio ${i + 1}` : 'Portfolio'}
                </a>
              ))}
              {candidate.github && (
                <a href={candidate.github} target="_blank" rel="noreferrer" className="social-link">
                  <FiGithub /> GitHub
                </a>
              )}
              {candidate.linkedin && (
                <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="social-link">
                  <FiLinkedin /> LinkedIn
                </a>
              )}
            </>
          )}
          </>
          )}
        </aside>
      </div>

      <SubscriptionModal
        open={subscriptionModalOpen}
        onClose={() => { setSubscriptionModalOpen(false); loadData(); }}
      />
    </div>
  );
}
