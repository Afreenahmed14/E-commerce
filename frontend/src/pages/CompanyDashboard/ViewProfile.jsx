import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit, FiMapPin, FiGlobe, FiPhone, FiMail, FiUser } from 'react-icons/fi';
import { companyService } from '../../services/companyService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import StarRating from '../../components/common/StarRating';
import '../CandidateDashboard/ViewProfile.css';

export default function CompanyViewProfile() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyService.getMyProfile()
      .then((res) => setCompany(res.data.company))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading your profile…" />;
  if (!company) return null;

  const location = [company.location?.city, company.location?.state, company.location?.country]
    .filter(Boolean).join(', ');

  return (
    <div className="view-profile-page">
      <div className="dashboard-header">
        <h1>Company Profile</h1>
        <Link to="/company/dashboard/profile/edit">
          <Button size="sm"><FiEdit /> Edit Profile</Button>
        </Link>
      </div>

      <Card className="view-profile-hero">
        <img
          className="view-profile-avatar"
          src={company.logo || 'https://placehold.co/120x120?text=Logo'}
          alt={company.companyName}
        />
        <div className="view-profile-hero-info">
          <h2>{company.companyName}</h2>
          <p className="text-muted">{company.industry || 'Industry not specified'}</p>
          <div className="view-profile-hero-meta">
            {location && <span><FiMapPin size={14} /> {location}</span>}
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer"><FiGlobe size={14} /> Website</a>
            )}
          </div>
          <StarRating value={company.rating} reviewsCount={company.reviewsCount || 0} size={16} />
        </div>
        <Badge variant={company.verificationStatus === 'verified' ? 'success' : 'default'}>
          {company.verificationStatus || 'unverified'}
        </Badge>
      </Card>

      <Card className="view-profile-section">
        <h3>About</h3>
        <p>{company.description || 'No description added yet.'}</p>
      </Card>

      <Card className="view-profile-section">
        <h3>Contact Person</h3>
        <div className="view-profile-links">
          {company.contactPerson?.name && <span><FiUser size={14} /> {company.contactPerson.name}{company.contactPerson.designation ? ` · ${company.contactPerson.designation}` : ''}</span>}
          {(company.contactPerson?.phone || company.phone) && <span><FiPhone size={14} /> {company.contactPerson?.phone || company.phone}</span>}
          {company.email && <span><FiMail size={14} /> {company.email}</span>}
        </div>
      </Card>

      {company.gstNumber && (
        <Card className="view-profile-section">
          <h3>Business Details</h3>
          <p className="text-muted">GST Number: {company.gstNumber}</p>
        </Card>
      )}
    </div>
  );
}
