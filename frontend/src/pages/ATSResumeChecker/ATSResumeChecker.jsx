import { useState, useRef } from 'react';
import {
  FiUpload, FiDownload, FiCheckCircle, FiRefreshCw, FiCpu, FiArrowRight,
  FiEdit3, FiTrendingUp, FiTarget, FiFileText, FiZap,
} from 'react-icons/fi';
import { atsService } from '../../services/atsService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { useAlert } from '../../context/AlertContext';
import './ATSResumeChecker.css';

const BREAKDOWN_LABELS = {
  keywords: 'Keywords',
  formatting: 'Formatting',
  sections: 'Sections',
  achievements: 'Achievements',
  actionVerbs: 'Action Verbs',
  grammar: 'Grammar',
  readability: 'Readability',
};

const scoreColor = (n) => {
  if (n >= 75) return 'var(--color-success)';
  if (n >= 50) return 'var(--color-warning)';
  return 'var(--color-danger)';
};

const CATEGORY_LABEL = { best: 'Best Match', good: 'Good Match', low: 'Low Match' };
const CATEGORY_VARIANT = { best: 'success', good: 'info', low: 'warning' };

const HEADER_CHIPS = [
  { icon: FiCheckCircle, tone: 'green', title: 'ATS Score Analysis', sub: 'Know how ATS sees your resume' },
  { icon: FiEdit3, tone: 'purple', title: 'Optimization Tips', sub: 'Get actionable suggestions' },
  { icon: FiCpu, tone: 'orange', title: 'Better Job Matches', sub: 'Increase your opportunities' },
];

const FEATURE_CARDS = [
  { icon: FiFileText, tone: 'blue', title: 'Get Your ATS Score', sub: 'Find out how well your resume performs with Applicant Tracking Systems.' },
  { icon: FiZap, tone: 'purple', title: 'AI-Powered Suggestions', sub: 'Get personalized tips to improve your resume content and format.' },
  { icon: FiTrendingUp, tone: 'green', title: 'Boost Your Visibility', sub: 'Increase your chances of getting noticed by top companies.' },
  { icon: FiTarget, tone: 'orange', title: 'Find Better Matches', sub: 'Get recommended jobs based on your skills and resume.' },
];

const HOW_IT_WORKS = [
  { n: 1, tone: 'blue', title: 'Upload Resume', sub: 'Upload your resume in PDF, DOCX, JPG, or PNG format.' },
  { n: 2, tone: 'purple', title: 'Get Analysis', sub: 'Our AI analyzes your resume against ATS standards.' },
  { n: 3, tone: 'green', title: 'Receive Suggestions', sub: 'Get detailed feedback and improvement tips.' },
  { n: 4, tone: 'orange', title: 'Find Opportunities', sub: 'Discover matched jobs and boost your career chances.' },
];

export default function ATSResumeChecker() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);
  const { showError, showSuccess } = useAlert();

  const handleFileChange = (e) => setFile(e.target.files?.[0] || null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleAnalyze = async () => {
    if (!file) { showError('Please select a resume file.'); return; }
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await atsService.analyzeResume(file);
      setResult(res.data);
      showSuccess('Resume analyzed successfully!');
      atsService.getHistory().then((h) => setHistory(h.data.analyses)).catch(() => {});
    } catch (err) {
      showError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadHistory = async () => {
    setShowHistory((s) => !s);
    if (!history.length) {
      try {
        const res = await atsService.getHistory();
        setHistory(res.data.analyses);
      } catch { /* ignore */ }
    }
  };

  const analysis = result?.analysis;
  const matchResults = result?.matchResults || result?.data?.matchResults || [];

  return (
    <div className="ats-page">
      <div className="ats-header">
        <div className="ats-header-copy">
          <h1>ATS Resume <span className="ats-title-accent">Checker</span></h1>
          <p className="text-muted">Get AI-powered insights to improve your resume and increase your chances of getting hired.</p>
        </div>
        <div className="ats-header-chips">
          {HEADER_CHIPS.map(({ icon: Icon, tone, title, sub }) => (
            <div className={`ats-header-chip ats-header-chip--${tone}`} key={title}>
              <span className="ats-header-chip-icon"><Icon size={16} /></span>
              <span className="ats-header-chip-copy"><strong>{title}</strong><small>{sub}</small></span>
            </div>
          ))}
        </div>
      </div>

      <Card className="ats-upload-card">
        <div
          className={`ats-dropzone ${dragOver ? 'is-dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <span className="ats-dropzone-icon"><FiUpload size={26} /></span>
          <p className="ats-dropzone-title">{file ? file.name : 'Upload your resume'}</p>
          <span className="text-muted">Click to upload or drag and drop your resume here</span>
          <span className="ats-dropzone-formats">PDF · DOCX · JPG · PNG (Max 5MB)</span>
          <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx,image/*" onChange={handleFileChange} />
        </div>
        <div className="ats-upload-actions">
          <Button onClick={handleAnalyze} loading={analyzing} disabled={!file}>
            <FiCpu /> {analyzing ? 'Analyzing…' : 'Analyze Resume'} {!analyzing && <FiArrowRight size={15} />}
          </Button>
          <Button variant="secondary" onClick={loadHistory}>
            <FiRefreshCw /> {showHistory ? 'Hide History' : 'Past Analyses'}
          </Button>
        </div>
      </Card>

      <div className="ats-feature-row">
        {FEATURE_CARDS.map(({ icon: Icon, tone, title, sub }) => (
          <div className={`ats-feature-card ats-feature-card--${tone}`} key={title}>
            <span className="ats-feature-icon"><Icon size={20} /></span>
            <strong>{title}</strong>
            <p className="text-muted">{sub}</p>
          </div>
        ))}
      </div>

      <Card className="ats-how-it-works">
        <h3>How It Works</h3>
        <div className="ats-steps-row">
          {HOW_IT_WORKS.map((step, i) => (
            <div className="ats-step" key={step.n}>
              <span className={`ats-step-num ats-step-num--${step.tone}`}>{step.n}</span>
              <div>
                <strong>{step.title}</strong>
                <p className="text-muted">{step.sub}</p>
              </div>
              {i < HOW_IT_WORKS.length - 1 && <span className="ats-step-arrow">›</span>}
            </div>
          ))}
        </div>
      </Card>

      {showHistory && (
        <Card className="ats-history">
          <h3>Past Analyses</h3>
          {history.length === 0 ? (
            <p className="text-muted">No past analyses found.</p>
          ) : (
            <div className="ats-history-list">
              {history.map((h) => (
                <div key={h._id} className="ats-history-item">
                  <span className="ats-history-score">{h.atsScore}/100</span>
                  <span className="text-muted">· {h.bestMatch?.jobTitle || 'No best match'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {analyzing && <Loader label="Analyzing your resume with AI…" />}

      {analysis && (
        <div className="ats-results">
          {/* Score hero */}
          <Card className="ats-score-card" style={{ textAlign: 'center' }}>
            <div className="ats-score-ring" style={{ borderColor: scoreColor(analysis.atsScore) }}>
              <span className="ats-score-value" style={{ color: scoreColor(analysis.atsScore) }}>{analysis.atsScore}</span>
              <span className="ats-score-label">/ 100</span>
            </div>
            <h2>ATS Score</h2>
            <p className="text-muted">Overall compatibility with applicant tracking systems</p>
            <div className="ats-readability">
              {analysis.atsScore >= 75 ? 'Excellent — recruiters will see a well-optimized resume.' :
                analysis.atsScore >= 50 ? 'Decent — a few tweaks will meaningfully improve your score.' :
                'Needs work — follow the suggestions below to stand out.'}
            </div>
          </Card>

          {/* Breakdown bars */}
          <Card className="ats-breakdown-card">
            <h3>Score Breakdown</h3>
            {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => {
              const val = analysis.atsBreakdown?.[key] || 0;
              return (
                <div key={key} className="ats-bar-row">
                  <span className="ats-bar-label">{label}</span>
                  <div className="ats-bar-track">
                    <div className="ats-bar-fill" style={{ width: `${val}%`, background: scoreColor(val) }} />
                  </div>
                  <span className="ats-bar-value">{val}</span>
                </div>
              );
            })}
          </Card>

          {/* Suggestions + missing keywords */}
          <Card className="ats-suggestions-card">
            <h3>Suggestions</h3>
            <ul className="ats-list">
              {(analysis.suggestions || []).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <h3>Missing Keywords</h3>
            <div className="ats-chip-row">
              {(analysis.missingKeywords || []).map((k) => <Badge key={k} variant="warning">{k}</Badge>)}
              {(!analysis.missingKeywords || !analysis.missingKeywords.length) && <span className="text-muted">No missing keywords — great keyword coverage.</span>}
            </div>
          </Card>

          {/* Recommended skills / certs / projects */}
          <Card className="ats-recommend-card">
            <h3>Recommended Skills</h3>
            <div className="ats-chip-row">{(analysis.recommendedSkills || []).map((s) => <Badge key={s} variant="success">{s}</Badge>)}</div>
            <h3>Recommended Certifications</h3>
            <div className="ats-chip-row">{(analysis.recommendedCertifications || []).map((s) => <Badge key={s} variant="info">{s}</Badge>)}</div>
            <h3>Recommended Projects</h3>
            <ul className="ats-list">{(analysis.recommendedProjects || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </Card>

          {/* Improved summary */}
          {analysis.improvedSummary && (
            <Card className="ats-improved-card">
              <h3>✨ Improved Resume Summary</h3>
              <blockquote className="ats-improved-summary">{analysis.improvedSummary}</blockquote>
            </Card>
          )}

          {/* Job matches */}
          {matchResults.length > 0 && (
            <Card className="ats-matches-card">
              <h3>🎯 Recommended Jobs</h3>
              <div className="ats-match-list">
                {matchResults.map((m, idx) => (
                  <div key={idx} className="ats-match-item">
                    <div className="ats-match-info">
                      <div>
                        <strong>{m.jobTitle}</strong>
                        <div className="text-muted">{m.companyName || ''}</div>
                      </div>
                      <Badge variant={CATEGORY_VARIANT[m.category] || 'default'}>{CATEGORY_LABEL[m.category] || m.category}</Badge>
                    </div>
                    <div className="ats-match-right">
                      <span className="ats-match-pct" style={{ color: scoreColor(m.matchPercentage) }}>{m.matchPercentage}%</span>
                      {m.topSkillsMatch?.length > 0 && (
                        <div className="ats-chip-row"><span className="text-muted">Top:</span>{m.topSkillsMatch.slice(0, 4).map((s) => <Badge key={s} variant="success">{s}</Badge>)}</div>
                      )}
                      {m.missingSkills?.length > 0 && (
                        <div className="ats-chip-row"><span className="text-muted">Missing:</span>{m.missingSkills.slice(0, 4).map((s) => <Badge key={s} variant="warning">{s}</Badge>)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {result?.savedAnalysisId && (
        <div className="ats-footer-note">
          <Button variant="secondary" size="sm" onClick={() => showSuccess('Improved resume download is based on the improved summary above — copy it into your resume.')}>
            <FiDownload /> Improved Resume
          </Button>
        </div>
      )}
    </div>
  );
}
