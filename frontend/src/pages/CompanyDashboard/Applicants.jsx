import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiVideo } from 'react-icons/fi';
import { jobService } from '../../services/jobService';
import { applicationService } from '../../services/applicationService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import StarRating from '../../components/common/StarRating';
import { formatDate } from '../../utils/formatters';
import './Applicants.css';

const STATUS_VARIANT = { applied: 'default', shortlisted: 'info', hired: 'success', rejected: 'danger' };

/**
 * "All applicants at a glance" — every job the company has posted, and
 * directly beneath each one, the candidates who applied (name, skills,
 * status), without having to click into each job individually. Clicking
 * a candidate goes to that job's full Applicants page for the resume,
 * status changes, messaging, and interview scheduling.
 */
export default function Applicants() {
  const [groups, setGroups] = useState([]); // [{ job, applications }]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const jobsRes = await jobService.getMyJobs();
      const jobs = jobsRes.data.jobs || [];
      const results = await Promise.all(
        jobs.map((job) => applicationService.getForJob(job._id).then((r) => ({ job, applications: r.data.applications || [] })))
      );
      setGroups(results);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader label="Loading applicants…" />;

  const totalApplicants = groups.reduce((sum, g) => sum + g.applications.length, 0);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Applicants</h1>
        <p className="text-muted">{totalApplicants} applicant{totalApplicants === 1 ? '' : 's'} across {groups.length} job{groups.length === 1 ? '' : 's'}</p>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No job postings yet" description="Post a job to start receiving applications." />
      ) : (
        <div className="applicants-groups">
          {groups.map(({ job, applications }) => (
            <Card key={job._id} className="applicants-group-card">
              <div className="applicants-group-header">
                <div>
                  <h3 style={{ margin: '0 0 2px' }}>{job.title}</h3>
                  <p className="text-muted" style={{ margin: 0 }}>{job.jobType} · Posted {formatDate(job.createdAt)}</p>
                </div>
                <Link to={`/company/dashboard/jobs/${job._id}/applicants`}>
                  <span className="social-link"><FiUsers /> View job page</span>
                </Link>
              </div>

              {applications.length === 0 ? (
                <p className="text-muted applicants-none">No applicants yet.</p>
              ) : (
                <div className="applicants-mini-list">
                  {applications.map((app) => (
                    <Link
                      key={app._id}
                      to={`/company/dashboard/jobs/${job._id}/applicants`}
                      className="applicant-mini-row"
                    >
                      <img
                        src={app.candidateId?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${app.candidateId?.name || 'C'}`}
                        alt=""
                        className="applicant-mini-avatar"
                      />
                      <div className="applicant-mini-info">
                        <strong>{app.candidateId?.name}</strong>
                        <StarRating value={app.candidateId?.rating} size={12} />
                        {app.candidateId?.skills?.length > 0 && (
                          <div className="applicant-mini-skills">
                            {app.candidateId.skills.slice(0, 5).map((skill) => (
                              <Badge key={skill} variant="default">{skill}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant={STATUS_VARIANT[app.status] || 'default'}>{app.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
