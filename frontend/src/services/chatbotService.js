import api from './api';

/**
 * Feature 1 — AI Career Assistant chatbot.
 * The send-message endpoint streams tokens as SSE, so that one call returns
 * a ReadableStream rather than a parsed JSON body.
 */
export const chatbotService = {
  createConversation: () => api.post('/chatbot/conversations').then((r) => r.data),
  listConversations: () => api.get('/chatbot/conversations').then((r) => r.data),
  deleteConversation: (id) => api.delete(`/chatbot/conversations/${id}`).then((r) => r.data),
  getMessages: (id) => api.get(`/chatbot/conversations/${id}/messages`).then((r) => r.data),
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/chatbot/conversations/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

/**
 * Sends a message and reads the SSE stream returned by the backend.
 * Yields parsed events (user_message / token / done / error) to `onEvent`.
 * Uses fetch directly so we can consume the streaming response body.
 */
export const streamChatbot = async (conversationId, content, onEvent) => {
  const token = localStorage.getItem('hr_access_token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://e-commerce-zvmh.onrender.com/api/v1';

  let res;
  try {
    res = await fetch(`${baseUrl}/chatbot/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
      credentials: 'include',
    });
  } catch (err) {
    onEvent({
      type: 'error',
      data: { message: 'Network error — please check your connection.' },
    });
    return;
  }

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    onEvent({
      type: 'error',
      data: { message: err.message || 'Failed to contact AI assistant.' },
    });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventType = 'message';

  const handleFrame = (raw) => {
    const line = raw.trim();
    if (!line) return;

    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim();
      return;
    }

    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      if (!data) return;
      try {
        onEvent({ type: eventType, data: JSON.parse(data) });
      } catch {
        // Ignore malformed frames.
      }
    }
  };

  // SSE frames are separated by a blank line. `handleFrame` is called for
  // each blank-line-delimited frame, but we also flush a trailing partial
  // frame at EOF so nothing is dropped.
  const flushFrame = () => {
    if (!buffer.trim()) return;
    buffer.split('\n').forEach(handleFrame);
    buffer = '';
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on blank lines, which terminate an SSE frame.
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || '';
      frames.forEach((frame) => frame.split('\n').forEach(handleFrame));
    }
    flushFrame();
  } catch {
    onEvent({
      type: 'error',
      data: { message: 'Connection interrupted while streaming.' },
    });
  }
};
