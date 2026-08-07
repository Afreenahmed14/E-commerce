import { useEffect, useState } from 'react';
import { FiBriefcase, FiUsers, FiFileText, FiCpu, FiTrendingUp } from 'react-icons/fi';
import { adminInsightsService } from '../../services/adminInsightsService';
import { useAlert } from '../../context/AlertContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import './AdminInsights.css';

export default function AdminInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useAlert();

  useEffect(() => {
    adminInsightsService.get()
      .then((res) => setData(res.data))
      .catch((err) => showError(err.response?.data?.message || 'Could not load insights.'))
      .finally(() => setLoading(false));
  }, [showError]);

  if (loading) return <Loader fullPage label="Generating AI insights…" />;
  if (!data) return <p className="text-muted">No data available.</p>;

  const { metrics, aiInsight } = data;

  const statCards = [
    { label: 'Total Jobs', value: metrics.totalJobs, icon: <FiFileText /> },
    { label: 'Total Candidates', value: metrics.totalCandidates, icon: <FiUsers /> },
    { label: 'Total Companies', value: metrics.totalCompanies, icon: <FiBriefcase /> },
    { label: 'Total Applications', value: metrics.totalApplications, icon: <FiTrendingUp /> },
  ];

  return (
    <div className="admin-insights-page">
      <div className="dashboard-header">
        <h1>Admin AI Dashboard</h1>
        <p className="text-muted">Platform analytics and AI-generated insights.</p>
      </div>

      <div className="insights-stats">
        {statCards.map((s) => (
          <Card key={s.label} className="insights-stat-card">
            <div className="insights-stat-icon">{s.icon}</div>
            <div>
              <div className="insights-stat-value">{s.value ?? 0}</div>
              <div className="text-muted">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {aiInsight && (
        <Card className="insights-ai-card">
          <div className="insights-ai-title"><FiCpu /> AI Insight</div>
          <p>{aiInsight}</p>
        </Card>
      )}

      <div className="insights-grid">
        <Card className="insights-panel">
          <h3>Top Skills</h3>
          <div className="insights-chip-row">
            {metrics.topSkills.map((s) => (
              <Badge key={s.skill} variant="info">{s.skill} <span className="insights-count">{s.count}</span></Badge>
            ))}
            {metrics.topSkills.length === 0 && <span className="text-muted">No skills data.</span>}
          </div>
        </Card>

        <Card className="insights-panel">
          <h3>Most Applied Jobs</h3>
          {metrics.mostAppliedJobs.map((j) => (
            <div key={j.jobId} className="insights-row">
              <span>{j.title}</span>
              <span className="text-muted">{j.company}</span>
              <Badge variant="primary">{j.count}</Badge>
            </div>
          ))}
          {metrics.mostAppliedJobs.length === 0 && <span className="text-muted">No applications yet.</span>}
        </Card>

        <Card className="insights-panel">
          <h3>Most Active Recruiters</h3>
          {metrics.mostActiveRecruiters.map((r) => (
            <div key={r.companyId} className="insights-row">
              <span>{r.companyName}</span>
              <Badge variant="primary">{r.jobCount} jobs</Badge>
            </div>
          ))}
          {metrics.mostActiveRecruiters.length === 0 && <span className="text-muted">No recruiters yet.</span>}
        </Card>

        <Card className="insights-panel">
          <h3>Most Active Candidates</h3>
          {metrics.mostActiveCandidates.map((c) => (
            <div key={c.candidateId} className="insights-row">
              <span>{c.name}</span>
              <Badge variant="primary">{c.applicationCount} apps</Badge>
            </div>
          ))}
          {metrics.mostActiveCandidates.length === 0 && <span className="text-muted">No candidates yet.</span>}
        </Card>

        <Card className="insights-panel">
          <h3>Top Companies by Applications</h3>
          {metrics.topCompaniesByApplications.map((c) => (
            <div key={c.companyId} className="insights-row">
              <span>{c.companyName}</span>
              <Badge variant="primary">{c.applicationCount} apps</Badge>
            </div>
          ))}
          {metrics.topCompaniesByApplications.length === 0 && <span className="text-muted">No data.</span>}
        </Card>
      </div>
    </div>
  );
}
