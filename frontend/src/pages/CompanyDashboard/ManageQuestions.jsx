import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2, FiZap, FiSave, FiX } from 'react-icons/fi';
import { mcqService } from '../../services/mcqService';
import { jobService } from '../../services/jobService';
import { useAlert } from '../../context/AlertContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import './ManageQuestions.css';

const QUESTION_TYPES = ['mcq', 'technical', 'screening'];

const blankQuestion = () => ({
  type: 'mcq',
  question: '',
  options: ['', '', '', ''],
  correctOptionIndex: 0,
  correctAnswer: '',
});

export default function ManageQuestions() {
  const { jobId } = useParams();
  const { showError, showSuccess } = useAlert();

  const [job, setJob] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual add form state
  const [draft, setDraft] = useState(blankQuestion());
  const [adding, setAdding] = useState(false);

  // AI generation state
  const [genCount, setGenCount] = useState(10);
  const [genFocus, setGenFocus] = useState('');
  const [generating, setGenerating] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      jobService.getById(jobId).then((res) => setJob(res.data.job)).catch(() => {}),
      mcqService.getForJob(jobId).then((res) => setQuestions(res.data.questions || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [jobId]);

  const resetDraft = () => setDraft(blankQuestion());

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!draft.question.trim()) {
      showError('Please enter the question text.');
      return;
    }
    if (draft.type === 'mcq' && draft.options.filter((o) => o.trim()).length < 2) {
      showError('MCQ questions need at least 2 options.');
      return;
    }
    setAdding(true);
    try {
      const payload = {
        type: draft.type,
        question: draft.question.trim(),
        options: draft.type === 'mcq' ? draft.options.filter((o) => o.trim()) : [],
        correctOptionIndex: draft.type === 'mcq' ? draft.correctOptionIndex : null,
        correctAnswer: draft.type !== 'mcq' ? draft.correctAnswer.trim() : '',
      };
      const res = await mcqService.addQuestions(jobId, [payload]);
      setQuestions((prev) => [...prev, ...(res.data.questions || [])]);
      resetDraft();
      showSuccess('Question added.');
    } catch (err) {
      showError(err.response?.data?.message || 'Could not add this question.');
    } finally {
      setAdding(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await mcqService.generate(jobId, genCount, genFocus.trim());
      setQuestions((prev) => [...prev, ...(res.data.questions || [])]);
      showSuccess(`Generated ${res.data.questions?.length || 0} questions.`);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not auto-generate questions right now.');
    } finally {
      setGenerating(false);
    }
  };

  const startEdit = (q) => {
    setEditingId(q._id);
    setEditDraft({
      type: q.type,
      question: q.question,
      options: q.options?.length ? [...q.options] : ['', '', '', ''],
      correctOptionIndex: q.correctOptionIndex ?? 0,
      correctAnswer: q.correctAnswer || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (questionId) => {
    try {
      const payload = {
        question: editDraft.question.trim(),
        options: editDraft.type === 'mcq' ? editDraft.options.filter((o) => o.trim()) : [],
        correctOptionIndex: editDraft.type === 'mcq' ? editDraft.correctOptionIndex : null,
        correctAnswer: editDraft.type !== 'mcq' ? editDraft.correctAnswer.trim() : '',
      };
      const res = await mcqService.updateQuestion(questionId, payload);
      setQuestions((prev) => prev.map((q) => (q._id === questionId ? res.data.question : q)));
      cancelEdit();
      showSuccess('Question updated.');
    } catch (err) {
      showError(err.response?.data?.message || 'Could not update this question.');
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Delete this question?')) return;
    setQuestions((prev) => prev.filter((q) => q._id !== questionId));
    try {
      await mcqService.deleteQuestion(questionId);
    } catch {
      load();
    }
  };

  if (loading) return <Loader label="Loading questionnaire…" />;

  return (
    <div className="manage-questions-page">
      <div className="dashboard-header">
        <div>
          <Link to="/company/dashboard/jobs" className="manage-questions-back">
            <FiArrowLeft size={14} /> Back to My Jobs
          </Link>
          <h1>Screening Questions{job ? ` for "${job.title}"` : ''}</h1>
          <p className="text-muted">
            Candidates answer these before their application is submitted. Add questions yourself or let AI generate a set for this role.
          </p>
        </div>
      </div>

      <Card className="manage-questions-card">
        <h2 className="manage-questions-section-title"><FiZap /> AI auto-generate</h2>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Generates MCQs based on this job's title, developer type, and skills.
        </p>
        <div className="manage-questions-gen-row">
          <div className="form-field" style={{ maxWidth: 120 }}>
            <label className="form-label">How many</label>
            <input
              type="number"
              min={1}
              max={20}
              className="form-input"
              value={genCount}
              onChange={(e) => setGenCount(Number(e.target.value))}
            />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Focus area (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. React hooks, system design"
              value={genFocus}
              onChange={(e) => setGenFocus(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerate} loading={generating}>
            <FiZap /> Generate
          </Button>
        </div>
      </Card>

      <Card className="manage-questions-card">
        <h2 className="manage-questions-section-title"><FiPlus /> Add a question manually</h2>
        <form onSubmit={handleAddQuestion} className="manage-questions-form">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Question type</label>
              <select
                className="form-input form-select"
                value={draft.type}
                onChange={(e) => setDraft({ ...blankQuestion(), type: e.target.value })}
              >
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Question</label>
            <textarea
              className="form-input"
              rows={2}
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              placeholder="e.g. What is the virtual DOM in React?"
            />
          </div>

          {draft.type === 'mcq' ? (
            <div className="manage-questions-options">
              <label className="form-label">Options (select the correct one)</label>
              {draft.options.map((opt, idx) => (
                <div key={idx} className="manage-questions-option-row">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={draft.correctOptionIndex === idx}
                    onChange={() => setDraft({ ...draft, correctOptionIndex: idx })}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const options = [...draft.options];
                      options[idx] = e.target.value;
                      setDraft({ ...draft, options });
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="form-field">
              <label className="form-label">Model answer (used for recruiter reference/scoring)</label>
              <textarea
                className="form-input"
                rows={2}
                value={draft.correctAnswer}
                onChange={(e) => setDraft({ ...draft, correctAnswer: e.target.value })}
              />
            </div>
          )}

          <Button type="submit" loading={adding} size="sm">
            <FiPlus /> Add question
          </Button>
        </form>
      </Card>

      <Card className="manage-questions-card">
        <h2 className="manage-questions-section-title">Questionnaire ({questions.length})</h2>

        {questions.length === 0 ? (
          <EmptyState title="No questions yet" description="Candidates will apply with no questionnaire until you add questions above." />
        ) : (
          <div className="manage-questions-list">
            {questions.map((q, i) => (
              <div key={q._id} className="manage-questions-item">
                {editingId === q._id ? (
                  <div className="manage-questions-edit">
                    <textarea
                      className="form-input"
                      rows={2}
                      value={editDraft.question}
                      onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })}
                    />
                    {editDraft.type === 'mcq' && (
                      <div className="manage-questions-options">
                        {editDraft.options.map((opt, idx) => (
                          <div key={idx} className="manage-questions-option-row">
                            <input
                              type="radio"
                              name={`editCorrect-${q._id}`}
                              checked={editDraft.correctOptionIndex === idx}
                              onChange={() => setEditDraft({ ...editDraft, correctOptionIndex: idx })}
                            />
                            <input
                              type="text"
                              className="form-input"
                              value={opt}
                              onChange={(e) => {
                                const options = [...editDraft.options];
                                options[idx] = e.target.value;
                                setEditDraft({ ...editDraft, options });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="manage-questions-edit-actions">
                      <Button size="sm" onClick={() => saveEdit(q._id)}><FiSave /> Save</Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit}><FiX /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="manage-questions-item-header">
                      <span className="manage-questions-item-index">Q{i + 1}</span>
                      <Badge variant="default">{q.type}</Badge>
                      {q.autoGenerated && <Badge variant="info">AI generated</Badge>}
                      <div className="manage-questions-item-actions">
                        <button type="button" className="manage-questions-link-btn" onClick={() => startEdit(q)}>Edit</button>
                        <button type="button" className="manage-questions-link-btn manage-questions-danger" onClick={() => handleDelete(q._id)}>
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="manage-questions-item-text">{q.question}</p>
                    {q.type === 'mcq' && (
                      <ul className="manage-questions-item-options">
                        {(q.options || []).map((opt, idx) => (
                          <li key={idx} className={idx === q.correctOptionIndex ? 'manage-questions-correct' : ''}>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.type !== 'mcq' && q.correctAnswer && (
                      <p className="text-muted manage-questions-model-answer">Model answer: {q.correctAnswer}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
