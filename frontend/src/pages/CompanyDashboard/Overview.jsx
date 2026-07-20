import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiBookmark, FiEdit, FiStar } from 'react-icons/fi';
import { companyService } from '../../services/companyService';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import CountUpValue from '../../components/common/CountUpValue';
import StarRating from '../../components/common/StarRating';

export default function CompanyOverview() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyService.getMyProfile()
      .then((res) => setCompany(res.data.company))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading your dashboard…" />;

  return (
    <div>
      <div className="dashboard-header">
        <h1>Welcome, {company?.companyName}</h1>
        <Link to="/company/dashboard/profile"><Button size="sm"><FiEdit /> Edit Profile</Button></Link>
      </div>

      <div className="stat-grid stagger-children">
        <Card className="stat-card">
          <div className="stat-card-label"><FiBookmark size={14} /> Bookmarked</div>
          <div className="stat-card-value"><CountUpValue value={company?.bookmarkedCandidates?.length || 0} /></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label"><FiStar size={14} /> Rating</div>
          <div className="stat-card-value"><StarRating value={company?.rating} reviewsCount={company?.reviewsCount || 0} size={16} /></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label"><FiBriefcase size={14} /> Verification</div>
          <div className="stat-card-value" style={{ fontSize: 'var(--font-size-lg)', textTransform: 'capitalize' }}>
            {company?.verificationStatus}
          </div>
        </Card>
      </div>

      <Card style={{ padding: 'var(--space-5)' }}>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Ready to find your next engineer?</h3>
        <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          Search and filter verified engineers by skill, rate, and availability.
        </p>
        <Link to="/browse"><Button>Browse Engineers</Button></Link>
      </Card>
    </div>
  );
}
