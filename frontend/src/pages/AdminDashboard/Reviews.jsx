import { useEffect, useState } from 'react';
import { FiTrash2, FiStar } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await adminService.getReviews();
    setReviews(res.data.reviews);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    await adminService.deleteReview(id);
    load();
  };

  if (loading) return <Loader label="Loading reviews…" />;

  return (
    <div>
      <div className="dashboard-header"><h1>Reviews</h1></div>

      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {reviews.map((r) => (
            <Card key={r._id} style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{r.companyId?.companyName}</strong>
                  <span className="text-muted"> reviewed </span>
                  <strong>{r.candidateId?.headline}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-warning)', margin: 'var(--space-1) 0' }}>
                    <FiStar size={14} /> {r.rating}
                  </div>
                  {r.review && <p className="text-muted">{r.review}</p>}
                  <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(r.createdAt)}</span>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => handleDelete(r._id)}>
                  <FiTrash2 /> Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
