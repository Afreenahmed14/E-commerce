import { useEffect, useState } from 'react';
import { FiUsers, FiBriefcase, FiShield, FiFileText } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import CountUpValue from '../../components/common/CountUpValue';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboardStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading dashboard…" />;

  return (
    <div>
      <div className="dashboard-header"><h1>Admin Dashboard</h1></div>

      <div className="stat-grid stagger-children">
        <Card className="stat-card">
          <div className="stat-card-label"><FiUsers size={14} /> Candidates</div>
          <div className="stat-card-value"><CountUpValue value={stats.totalCandidates} /></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label"><FiBriefcase size={14} /> Companies</div>
          <div className="stat-card-value"><CountUpValue value={stats.totalCompanies} /></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label"><FiShield size={14} /> Pending Verifications</div>
          <div className="stat-card-value"><CountUpValue value={stats.pendingVerifications} /></div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label"><FiFileText size={14} /> Open Jobs</div>
          <div className="stat-card-value"><CountUpValue value={stats.openJobs} /></div>
        </Card>
      </div>
    </div>
  );
}
