import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';

const STATUS_VARIANT = { active: 'success', suspended: 'danger', pending: 'default', deleted: 'default' };

/** Full detail modal — verification history and notifications this account
 * has been party to, so an admin can review it before acting on the account. */
function UserDetailModal({ userId, role, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminService.getUserDetail(userId, role)
      .then((res) => setDetail(res.data))
      .finally(() => setLoading(false));
  }, [userId, role]);

  const toggleStatus = async () => {
    const newStatus = detail.user.status === 'suspended' ? 'active' : 'suspended';
    await adminService.updateUserStatus(userId, newStatus, role);
    onChanged();
    onClose();
  };

  const remove = async () => {
    if (!window.confirm('Permanently delete this account? This cannot be undone.')) return;
    await adminService.deleteUser(userId, role);
    onChanged();
    onClose();
  };

  return (
    <Modal isOpen title="Account detail" onClose={onClose}>
      {loading || !detail ? <Loader /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <section>
            <h4>Profile</h4>
            <p><strong>{detail.user.name}</strong> — {detail.user.email}</p>
            <p style={{ textTransform: 'capitalize' }}>
              Role: {role} &nbsp;|&nbsp; Status: <Badge variant={STATUS_VARIANT[detail.user.status] || 'default'}>{detail.user.status}</Badge>
              {detail.user.verificationStatus && <> &nbsp;|&nbsp; Verification: {detail.user.verificationStatus}</>}
            </p>
            <p>Joined {formatDate(detail.user.createdAt)}{detail.user.lastLogin && <> · Last login {formatDate(detail.user.lastLogin)}</>}</p>
            {detail.user.developerType && <p>Developer Type: {detail.user.developerType}</p>}
            {detail.user.subscription?.plan && <p style={{ textTransform: 'capitalize' }}>Plan: {detail.user.subscription.plan}</p>}
          </section>

          <section>
            <h4>Verification requests ({detail.verifications.length})</h4>
            {detail.verifications.length === 0 ? <p>None</p> : (
              <ul>
                {detail.verifications.map((v) => (
                  <li key={v._id}>{v.status} — {formatDate(v.createdAt)}{v.reviewNote ? ` (${v.reviewNote})` : ''}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4>Recent notifications ({detail.notifications.length})</h4>
            {detail.notifications.length === 0 ? <p>None</p> : (
              <ul>
                {detail.notifications.slice(0, 10).map((n) => (
                  <li key={n._id}>{n.title} — {formatDate(n.createdAt)}</li>
                ))}
              </ul>
            )}
          </section>

          {role !== 'admin' && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-outline btn-sm" onClick={toggleStatus}>
                {detail.user.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={remove}>Delete account</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { id, role }

  const load = async () => {
    setLoading(true);
    const res = await adminService.getUsers({ page, limit: 20, role: roleFilter || undefined });
    setUsers(res.data.users);
    setPagination(res.data.pagination);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    await adminService.updateUserStatus(user._id, newStatus, user.role);
    load();
  };

  const remove = async (user) => {
    if (!window.confirm(`Permanently delete ${user.name}'s account? This cannot be undone.`)) return;
    await adminService.deleteUser(user._id, user.role);
    load();
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1>Users</h1>
        <select className="form-select" value={roleFilter} onChange={(e) => { setPage(1); setRoleFilter(e.target.value); }}>
          <option value="">All Roles</option>
          <option value="candidate">Candidate</option>
          <option value="company">Company</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? <Loader /> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <button className="link-btn" onClick={() => setSelected({ id: u._id, role: u.role })}>{u.name}</button>
                    </td>
                    <td>{u.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                    <td><Badge variant={STATUS_VARIANT[u.status] || 'default'}>{u.status}</Badge></td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelected({ id: u._id, role: u.role })}>View</button>
                      {u.role !== 'admin' && (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => toggleStatus(u)}>
                            {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>Delete</button>
                        </>
                      )}
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

      {selected && (
        <UserDetailModal
          userId={selected.id}
          role={selected.role}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
