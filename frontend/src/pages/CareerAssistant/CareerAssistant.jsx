import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { FiSend, FiPlus, FiTrash2, FiPaperclip, FiMessageSquare } from 'react-icons/fi';
import { chatbotService, streamChatbot } from '../../services/chatbotService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useAlert } from '../../context/AlertContext';
import './CareerAssistant.css';
import 'highlight.js/styles/github-dark.css';

const SUGGESTIONS = [
  'Review my resume',
  'Prepare me for a React interview',
  'How to negotiate salary?',
  'Write a cover letter for a Node.js job',
  'What skills should I learn for a backend role?',
  'Give me 5 HR behavioral questions',
];

export default function CareerAssistant() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const { showError, showSuccess } = useAlert();

  const loadConversations = useCallback(() => {
    chatbotService.listConversations()
      .then((res) => setConversations(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const openConversation = async (id) => {
    setActiveId(id);
    setMessages([]);
    try {
      const res = await chatbotService.getMessages(id);
      setMessages(res.data);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not load messages.');
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await chatbotService.createConversation();
      const conv = res.data;
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv._id);
      setMessages([]);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not create conversation.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await chatbotService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
    } catch (err) {
      showError(err.response?.data?.message || 'Could not delete conversation.');
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!activeId || !file) return;
    setUploading(true);
    try {
      const res = await chatbotService.uploadAttachment(activeId, file);
      const { url, fileName, type, extractedText } = res.data;
      // Fold the attachment info into the next message so the AI sees it.
      const context = type === 'image'
        ? `[Attached image: ${fileName}] ${url}`
        : `[Attached resume: ${fileName}] Here is the extracted text:\n${extractedText || ''}`;
      setInput((prev) => (prev ? `${prev}\n\n${context}` : context));
      showSuccess('Attachment ready to send.');
      setFile(null);
    } catch (err) {
      showError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !activeId || sending) return;

    const optimistic = { _id: `local-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setSending(true);

    // Streaming assistant message placeholder.
    const assistantPlaceholder = { _id: `assistant-${Date.now()}`, role: 'assistant', content: '', streaming: true };
    setMessages((prev) => [...prev.filter((m) => m._id !== optimistic._id), optimistic, assistantPlaceholder]);

    let fullReply = '';
    let hadError = false;
    await streamChatbot(activeId, text, (ev) => {
      if (ev.type === 'token') {
        fullReply += ev.data.token;
        setMessages((prev) => prev.map((m) =>
          m._id === assistantPlaceholder._id ? { ...m, content: m.content + ev.data.token } : m
        ));
      } else if (ev.type === 'error') {
        hadError = true;
        setMessages((prev) => prev.map((m) =>
          m._id === assistantPlaceholder._id
            ? { ...m, content: `⚠️ ${ev.data?.message || ev.message || 'AI assistant error'}`, streaming: false }
            : m
        ));
      }
    });

    // Finalize the assistant message once streaming completes. Skip this if
    // an error event already set the bubble's content — otherwise the error
    // gets silently overwritten with the still-empty fullReply.
    if (!hadError) {
      setMessages((prev) => prev.map((m) =>
        m._id === assistantPlaceholder._id
          ? { ...m, content: fullReply || m.content || '⚠️ No response received from AI.', streaming: false }
          : m
      ));
    }
    setSending(false);

    // Refresh conversations to reflect the new title / timestamp.
    chatbotService.listConversations().then((res) => setConversations(res.data)).catch(() => {});
  };

  if (loading) return <Loader fullPage label="Loading your assistant…" />;

  return (
    <div className="assistant-page">
      <div className="assistant-sidebar">
        <Button size="sm" variant="primary" onClick={handleCreate} loading={creating} fullWidth className="assistant-new-btn">
          <FiPlus /> New Chat
        </Button>
        <div className="assistant-conv-list">
          {conversations.length === 0 ? (
            <p className="text-muted assistant-empty">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c._id}
                className={`assistant-conv ${activeId === c._id ? 'active' : ''}`}
                onClick={() => openConversation(c._id)}
              >
                <FiMessageSquare size={15} />
                <span className="assistant-conv-title">{c.title}</span>
                <button className="assistant-conv-del" onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }} aria-label="Delete">
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="assistant-main">
        {!activeId ? (
          <div className="assistant-welcome">
            <h1>AI Career Assistant</h1>
            <p className="text-muted">Resume review, interview prep, salary negotiation, career guidance — ask me anything recruitment-related.</p>
            <div className="assistant-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="assistant-suggestion" onClick={async () => {
                  if (!activeId) await handleCreate();
                  setTimeout(() => setInput(s), 200);
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="assistant-chat" ref={scrollRef}>
              {messages.length === 0 ? (
                <EmptyState title="Say hello!" description="Ask about your resume, interviews, or career growth." />
              ) : (
                messages.map((m) => (
                  <div key={m._id} className={`assistant-msg ${m.role}`}>
                    <div className="assistant-msg-bubble">
                      {m.role === 'assistant' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {m.content || ''}
                        </ReactMarkdown>
                      ) : (
                        <p>{m.content}</p>
                      )}
                      {m.streaming && <span className="assistant-typing" />}
                    </div>
                  </div>
                ))
              )}
            </div>

            {file && (
              <div className="assistant-attachment">
                <span>{file.name}</span>
                <Button size="sm" variant="secondary" onClick={handleUpload} loading={uploading}>Attach</Button>
                <button className="assistant-attach-clear" onClick={() => setFile(null)}>✕</button>
              </div>
            )}

            <form onSubmit={handleSend} className="assistant-inputbar">
              <button type="button" className="assistant-attach-btn" onClick={() => fileInputRef.current?.click()} aria-label="Attach file">
                <FiPaperclip size={20} />
              </button>
              <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} accept=".pdf,.docx,image/*" />
              <input
                className="assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about resumes, interviews, careers…"
                disabled={sending}
              />
              <button type="submit" className="assistant-send-btn" disabled={sending || !input.trim()} aria-label="Send">
                <FiSend size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
