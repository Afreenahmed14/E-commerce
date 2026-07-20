import { useEffect, useState } from 'react';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Badge from '../../components/common/Badge';

export default function AdminTaxonomy() {
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [developerTypes, setDeveloperTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newDeveloperType, setNewDeveloperType] = useState('');

  const load = async () => {
    setLoading(true);
    const [catRes, skillRes, devTypeRes] = await Promise.all([
      adminService.getCategories(),
      adminService.getSkills(),
      adminService.getDeveloperTypes(),
    ]);
    setCategories(catRes.data.categories);
    setSkills(skillRes.data.skills);
    setDeveloperTypes(devTypeRes.data.developerTypes);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await adminService.createCategory({ name: newCategory.trim() });
    setNewCategory('');
    load();
  };

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    await adminService.createSkill({ name: newSkill.trim() });
    setNewSkill('');
    load();
  };

  const addDeveloperType = async () => {
    if (!newDeveloperType.trim()) return;
    await adminService.createDeveloperType({ name: newDeveloperType.trim() });
    setNewDeveloperType('');
    load();
  };

  const removeCategory = async (id) => {
    await adminService.deleteCategory(id);
    load();
  };

  const removeSkill = async (id) => {
    await adminService.deleteSkill(id);
    load();
  };

  const removeDeveloperType = async (id) => {
    await adminService.deleteDeveloperType(id);
    load();
  };

  if (loading) return <Loader label="Loading taxonomy…" />;

  return (
    <div>
      <div className="dashboard-header"><h1>Categories &amp; Skills</h1></div>

      <div className="form-grid">
        <Card style={{ padding: 'var(--space-5)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Categories</h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button className="btn btn-primary btn-sm" onClick={addCategory}><FiPlus /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {categories.map((c) => (
              <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>{c.name}</span>
                <button className="notification-actions" style={{ background: 'none', border: 'none', color: 'var(--color-danger)' }} onClick={() => removeCategory(c._id)}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-5)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Developer Types</h3>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
            Shown on the candidate profile form, the admin candidate filter, and the Browse Freelancers filter.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="New developer type"
              value={newDeveloperType}
              onChange={(e) => setNewDeveloperType(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDeveloperType()}
            />
            <button className="btn btn-primary btn-sm" onClick={addDeveloperType}><FiPlus /></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {developerTypes.map((d) => (
              <Badge key={d._id}>
                {d.name}{' '}
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }} onClick={() => removeDeveloperType(d._id)}>
                  <FiTrash2 size={10} />
                </button>
              </Badge>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-5)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Skills</h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="New skill name"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            />
            <button className="btn btn-primary btn-sm" onClick={addSkill}><FiPlus /></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {skills.map((s) => (
              <Badge key={s._id}>
                {s.name}{' '}
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }} onClick={() => removeSkill(s._id)}>
                  <FiTrash2 size={10} />
                </button>
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
