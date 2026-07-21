import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiUser, FiCheckCircle } from 'react-icons/fi';
import { candidateService } from '../../services/candidateService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import './Hires.css';

/**
 * "Who hired me, and when" — every active ContactUnlock record where this
 * candidate is the one being hired, whether by a Company (a real hire) or
 * by a fellow Candidate (a Project Partner hire). See hireController.js /
 * ContactUnlock.js on the backend.
 */
export default function CandidateHires() {
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await candidateService.getHiredBy();
      setHires(res.data.hires);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader label="Loading your hires…" />;

  return (
    <div>
      <div className="dashboard-header"><h1>My Hires</h1></div>

      {hires.length === 0 ? (
        <EmptyState
          title="No hires yet"
          description="When a company or fellow engineer hires you, it'll show up here — along with who hired you and when."
        />
      ) : (
        <div className="connections-list">
          {hires.map((h) => {
            const isCompanyHire = h.hirerType === 'company';
            const hirer = isCompanyHire ? h.companyId : h.hiringCandidateId;
            const hirerName = hirer?.companyName || hirer?.name || 'A hirer';
            const hirerLink = isCompanyHire ? null : `/candidates/${hirer?._id}`;

            return (
              <Card key={h._id} className="connection-card">
                <div className="connection-header">
                  <div className="connection-identity">
                    <img
                      src={
                        hirer?.logo
                        || hirer?.profileImage
                        || `https://api.dicebear.com/7.x/initials/svg?seed=${hirerName}`
                      }
                      alt=""
                      className="connection-avatar"
                    />
                    <div>
                      {hirerLink ? (
                        <Link to={hirerLink}><strong>{hirerName}</strong></Link>
                      ) : (
                        <strong>{hirerName}</strong>
                      )}
                      <p className="connection-sub text-muted">
                        {isCompanyHire ? 'Hired you' : 'Hired you as a project partner'} on {formatDate(h.unlockDate)}
                      </p>
                    </div>
                  </div>
                  <div className="connection-badges">
                    <Badge variant={isCompanyHire ? 'default' : 'info'}>
                      {isCompanyHire ? <FiBriefcase size={12} /> : <FiUser size={12} />}
                      {' '}{isCompanyHire ? 'Company' : 'Project Partner'}
                    </Badge>
                  </div>
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
