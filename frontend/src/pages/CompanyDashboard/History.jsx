import { useState } from 'react';
import { FiUsers, FiCheckCircle } from 'react-icons/fi';
import Applicants from './Applicants';
import CompanyHires from './Hires';
import '../CandidateDashboard/History.css';

const TABS = [
  { id: 'applicants', label: 'Applicants', icon: FiUsers },
  { id: 'hires', label: 'Hired Candidates', icon: FiCheckCircle },
];

export default function CompanyHistory() {
  const [active, setActive] = useState('applicants');

  return (
    <div>
      <div className="dashboard-header">
        <h1>History</h1>
      </div>

      <div className="history-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`history-tab ${active === id ? 'active' : ''}`}
            onClick={() => setActive(id)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="history-tab-panel">
        {active === 'applicants' ? <Applicants /> : <CompanyHires />}
      </div>
    </div>
  );
}
