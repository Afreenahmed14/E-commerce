import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';

export default function AdminVerifications() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState({});

  const load = async () => {
    setLoading(true);
    const res = await adminService.getVerifications(statusFilter);
    setRequests(res.data.requests);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReview = async (id, status) => {
    await adminService.reviewVerification(id, { status, reviewNote: noteDrafts[id] || '' });
    load();
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1>Verification Requests</h1>
        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? <Loader /> : requests.length === 0 ? (
        <EmptyState title="No requests here" description="Nothing to review for this status." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {requests.map((r) => (
            <Card key={r._id} style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div>
                  <strong>{r.profileId?.name || r.profileId?.companyName}</strong> <span className="text-muted">({r.profileId?.email})</span>
                  <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                    Role: {r.role} · Submitted {formatDate(r.createdAt)}
                  </div>
                </div>
                <Badge variant={r.status === 'verified' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>
                  {r.status}
                </Badge>
              </div>

              {r.documents?.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                  {r.documents.map((doc, i) => (
                    <a key={i} href={doc} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                      Document {i + 1}
                    </a>
                  ))}
                </div>
              )}

              {r.status === 'pending' && (
                <>
                  <div className="form-field">
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="Optional note (e.g. reason for rejection)"
                      value={noteDrafts[r._id] || ''}
                      onChange={(e) => setNoteDrafts((d) => ({ ...d, [r._id]: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleReview(r._id, 'verified')}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReview(r._id, 'rejected')}>Reject</button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
