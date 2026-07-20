import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiPause, FiPlay } from 'react-icons/fi';
import { jobService } from '../../services/jobService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export default function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    jobService.getMyJobs().then((res) => setJobs(res.data.jobs)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (job) => {
    const status = job.status === 'open' ? 'closed' : 'open';
    setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, status } : j)));
    try {
      await jobService.update(job._id, { status });
    } catch {
      load();
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    setJobs((prev) => prev.filter((j) => j._id !== job._id));
    try {
      await jobService.remove(job._id);
    } catch {
      load();
    }
  };

  if (loading) return <Loader label="Loading your jobs…" />;

  return (
    <div>
      <div className="dashboard-header">
        <h1>My Job Postings</h1>
        <Link to="/company/dashboard/jobs/new"><Button size="sm"><FiPlus /> Post a Job</Button></Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No job postings yet"
          description="Post your first job to start receiving applications from engineers."
          action={<Link to="/company/dashboard/jobs/new"><Button size="sm"><FiPlus /> Post a Job</Button></Link>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {jobs.map((job) => (
            <Card key={job._id} style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{job.title}</h3>
                  <p className="text-muted" style={{ margin: 0 }}>
                    {job.jobType} · Posted {formatDate(job.createdAt)} · {job.applicationsCount || 0} applicant{job.applicationsCount === 1 ? '' : 's'}
                  </p>
                </div>
                <Badge variant={job.status === 'open' ? 'success' : 'default'}>{job.status}</Badge>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                <Link to={`/company/dashboard/jobs/${job._id}/applicants`}>
                  <Button size="sm" variant="secondary"><FiUsers /> View Applicants ({job.applicationsCount || 0})</Button>
                </Link>
                <Link to={`/company/dashboard/jobs/${job._id}/edit`}>
                  <Button size="sm" variant="secondary"><FiEdit /> Edit</Button>
                </Link>
                <Button size="sm" variant="secondary" onClick={() => toggleStatus(job)}>
                  {job.status === 'open' ? <><FiPause /> Close</> : <><FiPlay /> Reopen</>}
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(job)}>
                  <FiTrash2 /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
