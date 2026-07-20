import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { applicationService } from '../../services/applicationService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

const STATUS_VARIANT = { applied: 'default', shortlisted: 'info', hired: 'success', rejected: 'danger' };

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    applicationService.getMine().then((res) => setApplications(res.data.applications)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleWithdraw = async (app) => {
    if (!window.confirm(`Withdraw your application for "${app.jobId?.title}"?`)) return;
    setApplications((prev) => prev.filter((a) => a._id !== app._id));
    try {
      await applicationService.withdraw(app._id);
    } catch {
      load();
    }
  };

  if (loading) return <Loader label="Loading your applications…" />;

  return (
    <div>
      <div className="dashboard-header"><h1>My Applications</h1></div>

      {applications.length === 0 ? (
        <EmptyState
          title="You haven't applied to any jobs yet"
          description="Browse open jobs and apply to the ones that fit your skills."
          action={<Link to="/jobs"><Button size="sm">Browse Jobs</Button></Link>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {applications.map((app) => (
            <Card key={app._id} style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <Link to={`/jobs/${app.jobId?._id}`}><h3 style={{ margin: '0 0 2px' }}>{app.jobId?.title}</h3></Link>
                  <p className="text-muted" style={{ margin: 0 }}>
                    {app.companyId?.companyName} · Applied {formatDate(app.createdAt)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[app.status] || 'default'}>{app.status}</Badge>
              </div>

              {app.status === 'applied' && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <Button size="sm" variant="danger" onClick={() => handleWithdraw(app)}>
                    <FiTrash2 /> Withdraw
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
