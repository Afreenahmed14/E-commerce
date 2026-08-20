import { useState } from 'react';
import { FiBriefcase, FiCheckCircle } from 'react-icons/fi';
import MyApplications from './MyApplications';
import CandidateHires from './Hires';
import './History.css';

const TABS = [
  { id: 'applications', label: 'My Applications', icon: FiBriefcase },
  { id: 'hires', label: 'My Hires', icon: FiCheckCircle },
];

export default function CandidateHistory() {
  const [active, setActive] = useState('applications');

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
        {active === 'applications' ? <MyApplications /> : <CandidateHires />}
      </div>
    </div>
  );
}
