import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FiSend, FiPaperclip, FiSearch, FiBellOff, FiBell, FiTrash2, FiSmile, FiCheck } from 'react-icons/fi';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useAlert } from '../../context/AlertContext';
import { getAccessToken } from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { formatRelativeTime } from '../../utils/formatters';
import './Messages.css';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👏', '🙏', '💪', '🤝', '😊'];

export default function Messages() {
  const { user, role } = useAuth();
  const { onlineUsers } = useSocket() || {};
  const { showError } = useAlert();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmoji, setShowEmoji] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await conversationService.list();
      setConversations(res.data.conversations);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Socket connection
  useEffect(() => {
    if (!user) return undefined;
    const token = getAccessToken();
    const baseUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || 'https://e-commerce-zvmh.onrender.com';
    const origin = baseUrl.replace(/\/api\/v\d+$/, '');
    const socket = io(origin, { auth: { token }, withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('chat:message', ({ message, conversationId }) => {
      if (conversationId === activeId) {
        setMessages((prev) => [...prev, message]);
      }
      loadConversations();
    });

    socket.on('chat:typing', ({ conversationId, isTyping, senderRole }) => {
      if (senderRole !== role) {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: isTyping }));
      }
    });

    socket.on('chat:read', ({ conversationId }) => {
      if (conversationId === activeId) {
        setMessages((prev) => prev.map((m) =>
          m.senderRole !== role ? { ...m, readBy: role } : m
        ));
      }
    });

    return () => socket.disconnect();
  }, [user, activeId, role, loadConversations]);

  const openConversation = useCallback(async (id) => {
    setActiveId(id);
    setMessages([]);
    socketRef.current?.emit('chat:join', id);
    try {
      const res = await conversationService.getMessages(id);
      // Backend returns newest first; reverse for chronological display.
      setMessages(res.data.messages.reverse());
      conversationService.markRead(id);
      socketRef.current?.emit('chat:read', { conversationId: id });
    } catch (err) {
      showError(err.response?.data?.message || 'Could not load messages.');
    }
  }, [showError]);

  // Deep-link support: /messages?conv=<id> opens (and creates, if just
  // started elsewhere) a specific conversation, e.g. from a "Message"
  // button on a job or candidate/company profile page.
  useEffect(() => {
    const conv = searchParams.get('conv');
    if (!conv || loading) return;
    openConversation(conv);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('conv');
      return next;
    }, { replace: true });
  }, [searchParams, loading, openConversation, setSearchParams]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !activeId || sending) return;

    setSending(true);
    try {
      const optimistic = {
        _id: `local-${Date.now()}`,
        senderRole: role,
        senderId: user._id,
        text,
        attachment: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput('');
      socketRef.current?.emit('chat:message', { conversationId: activeId, text }, () => {
        loadConversations();
      });
    } catch {
      showError('Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value) => {
    setInput(value);
    socketRef.current?.emit('chat:typing', { conversationId: activeId, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:typing', { conversationId: activeId, isTyping: false });
    }, 1200);
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
      const res = await conversationService.upload(activeId, file);
      const attachment = res.data;
      socketRef.current?.emit('chat:message', { conversationId: activeId, text: '', attachment }, () => {
        loadConversations();
      });
      setFile(null);
    } catch (err) {
      showError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const toggleMute = async (id) => {
    const conv = conversations.find((c) => c._id === id);
    try {
      await conversationService.toggleMute(id, !conv?.mutedBy);
      loadConversations();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await conversationService.delete(id);
      if (activeId === id) { setActiveId(null); setMessages([]); }
      loadConversations();
    } catch { /* ignore */ }
  };

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const name = c.other?.name || c.other?.companyName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const activeConv = conversations.find((c) => c._id === activeId);
  const otherName = activeConv?.other?.name || activeConv?.other?.companyName || 'Chat';
  const showTyping = typingUsers[activeId];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, showTyping]);

  if (loading) return <Loader fullPage label="Loading messages…" />;

  return (
    <div className="messages-page">
      <div className="messages-sidebar">
        <div className="messages-search">
          <FiSearch size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" />
        </div>
        <div className="messages-conv-list">
          {filtered.length === 0 ? (
            <EmptyState title="No conversations" description="Companies reach out to you here." />
          ) : (
            filtered.map((c) => {
              const name = c.other?.name || c.other?.companyName || 'Unknown';
              const isOnline = !!onlineUsers?.[c.other?._id];
              return (
                <div
                  key={c._id}
                  className={`messages-conv ${activeId === c._id ? 'active' : ''}`}
                  onClick={() => openConversation(c._id)}
                >
                  <div className="messages-avatar-wrap">
                    <div className="messages-avatar">
                      {c.other?.profileImage || c.other?.logo ? (
                        <img src={c.other?.profileImage || c.other?.logo} alt="" />
                      ) : (
                        name[0]?.toUpperCase()
                      )}
                    </div>
                    {isOnline && <span className="messages-online-dot" />}
                  </div>
                  <div className="messages-conv-info">
                    <strong>{name}</strong>
                    <p className="text-muted">{c.lastMessagePreview || 'Say hello…'}</p>
                  </div>
                  {c.unreadCount > 0 && <span className="messages-unread">{c.unreadCount}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="messages-main">
        {!activeId ? (
          <EmptyState title="Select a conversation" description="Choose a chat from the list to start messaging." />
        ) : (
          <>
            <div className="messages-header">
              <div className="messages-header-identity">
                <div className="messages-avatar-wrap">
                  <div className="messages-avatar messages-avatar-lg">
                    {activeConv?.other?.profileImage || activeConv?.other?.logo ? (
                      <img src={activeConv?.other?.profileImage || activeConv?.other?.logo} alt="" />
                    ) : (
                      otherName[0]?.toUpperCase()
                    )}
                  </div>
                  {onlineUsers?.[activeConv?.other?._id] && <span className="messages-online-dot" />}
                </div>
                <div>
                  <strong>{otherName}</strong>
                  {showTyping ? (
                    <span className="messages-typing">typing…</span>
                  ) : onlineUsers?.[activeConv?.other?._id] ? (
                    <span className="messages-online-label">
                      <span className="messages-online-label-dot" /> Online
                    </span>
                  ) : (
                    <span className="text-muted">{activeConv?.other?.headline || ''}</span>
                  )}
                </div>
              </div>
              <div className="messages-header-actions">
                <button className="messages-icon-btn" onClick={() => toggleMute(activeId)} title="Mute/Unmute">
                  {activeConv?.mutedBy ? <FiBellOff /> : <FiBell />}
                </button>
                <button className="messages-icon-btn" onClick={() => handleDelete(activeId)} title="Delete conversation">
                  <FiTrash2 />
                </button>
              </div>
            </div>

            <div className="messages-thread" ref={scrollRef}>
              <div className="messages-thread-decor-dots" aria-hidden="true" />
              <div className="messages-thread-decor-sparkle" aria-hidden="true" />
              {messages.length === 0 ? (
                <div className="messages-empty-thread text-muted">Send the first message!</div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderRole === role;
                  return (
                    <div key={m._id} className={`messages-bubble-row ${mine ? 'mine' : ''}`}>
                      <div className={`messages-bubble ${mine ? 'mine' : ''}`}>
                        {m.text && <p>{m.text}</p>}
                        {m.attachment?.url && (
                          m.attachment.type === 'image' ? (
                            <img src={m.attachment.url} alt="" className="messages-img" />
                          ) : (
                            <a href={m.attachment.url} target="_blank" rel="noreferrer" className="messages-file">📎 {m.attachment.fileName || 'Attachment'}</a>
                          )
                        )}
                        <span className="messages-time text-muted">
                          {formatRelativeTime(m.createdAt)}
                          {mine && <FiCheck className={`messages-check ${m.readBy ? 'read' : ''}`} />}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {file && (
              <div className="messages-attachment">
                <span>{file.name}</span>
                <Button size="sm" variant="secondary" onClick={handleUpload} loading={uploading}>Send</Button>
                <button className="messages-attach-clear" onClick={() => setFile(null)}>✕</button>
              </div>
            )}

            <div className="messages-composer">
              <button className="messages-icon-btn" onClick={() => setShowEmoji((s) => !s)} title="Emoji">
                <FiSmile />
              </button>
              <button className="messages-icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach">
                <FiPaperclip />
              </button>
              <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.docx" />
              <input
                className="messages-input"
                value={input}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
                placeholder="Type a message…"
              />
              <button className="messages-send-btn" onClick={handleSend} disabled={!input.trim()}><FiSend /></button>
            </div>

            {showEmoji && (
              <div className="messages-emoji-bar">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => { setInput((v) => v + e); setShowEmoji(false); }}>{e}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
