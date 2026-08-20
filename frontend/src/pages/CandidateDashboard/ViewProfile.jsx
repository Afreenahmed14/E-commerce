import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit, FiMapPin, FiGithub, FiLinkedin, FiExternalLink, FiFileText, FiDownload, FiPhone, FiMail } from 'react-icons/fi';
import { candidateService } from '../../services/candidateService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import StarRating from '../../components/common/StarRating';
import { asDownloadUrl } from '../../utils/fileUrl';
import './ViewProfile.css';

export default function CandidateViewProfile() {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    candidateService.getMyProfile()
      .then((res) => setCandidate(res.data.candidate))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading your profile…" />;
  if (!candidate) return null;

  const location = [candidate.location?.city, candidate.location?.state, candidate.location?.country]
    .filter(Boolean).join(', ');

  return (
    <div className="view-profile-page">
      <div className="dashboard-header">
        <h1>My Profile</h1>
        <Link to="/candidate/dashboard/profile/edit">
          <Button size="sm"><FiEdit /> Edit Profile</Button>
        </Link>
      </div>

      <Card className="view-profile-hero">
        <img
          className="view-profile-avatar"
          src={candidate.profileImage || 'https://placehold.co/120x120?text=Photo'}
          alt={candidate.name}
        />
        <div className="view-profile-hero-info">
          <h2>{candidate.name}</h2>
          <p className="text-muted">{candidate.headline || 'No headline added yet'}</p>
          <div className="view-profile-hero-meta">
            {location && <span><FiMapPin size={14} /> {location}</span>}
            {candidate.experience !== undefined && (
              <span>{candidate.experience || 0}y {candidate.experienceMonths || 0}m experience</span>
            )}
            <span>₹{candidate.hourlyRate || 0}/hr</span>
          </div>
          <StarRating value={candidate.rating} reviewsCount={candidate.reviewsCount || 0} size={16} />
        </div>
        <Badge variant={candidate.visibility === 'public' ? 'success' : 'default'}>
          {candidate.visibility === 'public' ? 'Public Profile' : 'Private Profile'}
        </Badge>
      </Card>

      <Card className="view-profile-section">
        <h3>About</h3>
        <p>{candidate.about || 'No bio added yet.'}</p>
      </Card>

      <Card className="view-profile-section">
        <h3>Skills</h3>
        <div className="view-profile-skill-group">
          <span className="view-profile-skill-label">Primary</span>
          <div className="view-profile-badges">
            {(candidate.primarySkills || []).map((s) => <Badge key={s}>{s}</Badge>)}
            {!(candidate.primarySkills || []).length && <span className="text-muted">None added</span>}
          </div>
        </div>
        <div className="view-profile-skill-group">
          <span className="view-profile-skill-label">Secondary</span>
          <div className="view-profile-badges">
            {(candidate.secondarySkills || []).map((s) => <Badge key={s} variant="info">{s}</Badge>)}
            {!(candidate.secondarySkills || []).length && <span className="text-muted">None added</span>}
          </div>
        </div>
      </Card>

      <Card className="view-profile-section">
        <h3>Contact & Links</h3>
        <div className="view-profile-links">
          {candidate.phone && <span><FiPhone size={14} /> {candidate.phone}</span>}
          {candidate.email && <span><FiMail size={14} /> {candidate.email}</span>}
          {candidate.github && (
            <a href={candidate.github} target="_blank" rel="noreferrer"><FiGithub size={14} /> GitHub <FiExternalLink size={11} /></a>
          )}
          {candidate.linkedin && (
            <a href={candidate.linkedin} target="_blank" rel="noreferrer"><FiLinkedin size={14} /> LinkedIn <FiExternalLink size={11} /></a>
          )}
          {(candidate.portfolioLinks || []).map((link) => (
            <a key={link} href={link} target="_blank" rel="noreferrer"><FiExternalLink size={14} /> Portfolio</a>
          ))}
        </div>
      </Card>

      {candidate.resume && (
        <Card className="view-profile-section">
          <h3>Resume</h3>
          <a href={asDownloadUrl(candidate.resume, `${candidate.name}-resume`)} className="view-profile-resume-link">
            <FiFileText size={16} /> View Resume <FiDownload size={14} />
          </a>
        </Card>
      )}

      <Card className="view-profile-section">
        <h3>Languages & Availability</h3>
        <div className="view-profile-badges">
          {(candidate.languages || []).map((l) => <Badge key={l}>{l}</Badge>)}
        </div>
        <p className="text-muted" style={{ marginTop: 'var(--space-2)', textTransform: 'capitalize' }}>
          {candidate.availability || 'Not specified'} {candidate.location?.remote ? '· Open to remote' : ''}
        </p>
      </Card>
    </div>
  );
}
