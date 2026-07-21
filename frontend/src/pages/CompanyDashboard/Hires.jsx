import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';
import { companyService } from '../../services/companyService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import StarRating from '../../components/common/StarRating';
import { formatDate } from '../../utils/formatters';
import './Hires.css';

/**
 * "Who did we hire, and when" — every active ContactUnlock record where
 * this company is the hirer. Contact details (email/phone) are unlocked
 * for these candidates since hiring is what pays to reveal them.
 */
export default function CompanyHires() {
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await companyService.getHires();
      setHires(res.data.hires);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader label="Loading hired candidates…" />;

  return (
    <div>
      <div className="dashboard-header"><h1>Hired Candidates</h1></div>

      {hires.length === 0 ? (
        <EmptyState
          title="No hires yet"
          description="Candidates you hire from their profile will show up here, along with when you hired them and their contact details."
        />
      ) : (
        <div className="connections-list">
          {hires.map((h) => {
            const c = h.candidateId;
            if (!c) return null;
            return (
              <Card key={h._id} className="connection-card">
                <div className="connection-header">
                  <div className="connection-identity">
                    <img
                      src={c.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${c.name || 'E'}`}
                      alt=""
                      className="connection-avatar"
                    />
                    <div>
                      <Link to={`/candidates/${c._id}`}><strong>{c.name || 'Engineer'}</strong></Link>
                      <p className="connection-sub text-muted">
                        {c.headline || (c.skills || []).slice(0, 3).join(', ')}
                      </p>
                      <p className="connection-sub text-muted">Hired on {formatDate(h.unlockDate)}</p>
                    </div>
                  </div>
                  <div className="connection-badges">
                    <StarRating value={c.rating} size={13} showValue={false} />
                    {c.hourlyRate != null && <span className="text-muted">₹{c.hourlyRate}/hr</span>}
                  </div>
                </div>

                <div className="connection-work-actions">
                  {c.email && <Badge variant="default">{c.email}</Badge>}
                  {c.phone && <Badge variant="default">{c.phone}</Badge>}
                </div>

                <p className="connection-paid-note"><FiCheckCircle size={14} /> Hired</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
