import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import StarRating from '../../components/common/StarRating';

const VERIFICATION_VARIANT = { verified: 'success', pending: 'warning', rejected: 'danger', unverified: 'default' };

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return adminService.getCompanies({ page, limit: 20 })
      .then((res) => { setCompanies(res.data.companies); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (company) => {
    if (!window.confirm(`Permanently delete ${company.companyName}'s account? This cannot be undone.`)) return;
    await adminService.deleteUser(company._id, 'company');
    load();
  };

  return (
    <div>
      <div className="dashboard-header"><h1>Companies</h1></div>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Company</th><th>Contact Email</th><th>Industry</th><th>Rating</th><th>Verification</th><th></th></tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c._id}>
                    <td>{c.companyName}</td>
                    <td>{c.email}</td>
                    <td>{c.industry || '—'}</td>
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
