import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import StarRating from '../../components/common/StarRating';
import { DEVELOPER_TYPE_OPTIONS } from '../../utils/constants';

const VERIFICATION_VARIANT = { verified: 'success', pending: 'warning', rejected: 'danger', unverified: 'default' };

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [developerTypeOptions, setDeveloperTypeOptions] = useState(DEVELOPER_TYPE_OPTIONS);

  const load = () => {
    setLoading(true);
    return adminService.getCandidates({ page, limit: 20 })
      .then((res) => { setCandidates(res.data.candidates); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    adminService.getDeveloperTypes()
      .then((res) => setDeveloperTypeOptions(res.data.developerTypes.map((d) => d.name)))
      .catch(() => {});
  }, []);

  const changeDeveloperType = async (candidate, developerType) => {
    setSavingId(candidate._id);
    setCandidates((prev) => prev.map((c) => (c._id === candidate._id ? { ...c, developerType } : c)));
    try {
      await adminService.updateCandidateDeveloperType(candidate._id, developerType);
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (candidate) => {
    if (!window.confirm(`Permanently delete ${candidate.name}'s account? This cannot be undone.`)) return;
    await adminService.deleteUser(candidate._id, 'candidate');
    load();
  };

  return (
    <div>
      <div className="dashboard-header"><h1>Candidates</h1></div>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Headline</th><th>Developer Type</th><th>Rate</th><th>Rating</th><th>Verification</th><th></th></tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.headline || '—'}</td>
                    <td>
                      <select
                        className="form-select"
                        value={c.developerType || ''}
                        disabled={savingId === c._id}
                        onChange={(e) => changeDeveloperType(c, e.target.value)}
                      >
                        <option value="">— Not set —</option>
                        {developerTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td>₹{c.hourlyRate}/hr</td>
                    <td><StarRating value={c.rating} reviewsCount={c.reviewsCount} size={12} /></td>
                    <td><Badge variant={VERIFICATION_VARIANT[c.verificationStatus]}>{c.verificationStatus}</Badge></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
