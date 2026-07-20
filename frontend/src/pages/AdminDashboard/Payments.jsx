import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_VARIANT = { paid: 'success', created: 'default', failed: 'danger', refunded: 'warning' };

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminService.getPayments({ page, limit: 20, status: statusFilter || undefined })
      .then((res) => { setPayments(res.data.payments); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Subscription Payments</h1>
        <select className="form-select" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="created">Created</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Account</th><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td>{p.companyId?.companyName || p.candidateId?.headline || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.planId}</td>
                    <td>{formatCurrency(p.amount, p.currency)}</td>
                    <td><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></td>
                    <td>{formatDate(p.paymentDate || p.createdAt)}</td>
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
