# HourlyRecruit — AI Feature Rollout Plan

Ground rules carried through every phase: no existing file is rewritten wholesale,
no folder is renamed, existing routes/exports are untouched, `roleMiddleware` /
`authMiddleware` / `ApiResponse` / `ApiError` / `asyncHandler` conventions are
reused everywhere, and after each phase the backend must boot (`npm run dev`)
and the frontend must build cleanly before moving to the next phase.

## Shared infra (built once, reused by Features 1, 2, 3, 6, 10)
- `src/config/openai.js` — single OpenAI client, reads `OPENAI_API_KEY`
- `src/services/aiService.js` — thin wrapper: `chatComplete()`, `chatCompleteStream()`,
  `extractJSON()` (asks the model for strict JSON, parses safely)
- `src/services/resumeParserService.js` — PDF (`pdf-parse`) / DOCX (`mammoth`) →
  plain text, reused by chatbot uploads, ATS checker, and job matching
- New npm deps (additive only): `openai`, `pdf-parse`, `mammoth`, `socket.io`,
  `nodemailer`

## Phase-by-phase order
1. **Feature 1 — AI Career Chatbot** *(this message)* — conversations + messages
   collections, streaming chat endpoint, recruitment-only system prompt,
   file/resume upload into chat. This also stands up the shared AI infra
   everything else depends on.
2. **Feature 2 — ATS Resume Checker** — reuses `resumeParserService`, adds
   scoring endpoint + `AtsReport` model.
3. **Feature 3 — AI Job Matching** — reuses ATS-extracted resume text, scores
   against `Job` collection, surfaces on candidate dashboard.
4. **Feature 6 — Auto-generated MCQs** — reuses `aiService.extractJSON`.
5. **Feature 5 — Job Application Questions** — schema on `Job` + `Application`,
   depends on Feature 6 for auto-generation but works without it.
6. **Feature 4 — Company↔Candidate Chat** — introduces Socket.IO server
   (attached to the existing `http.createServer(app)`, not replacing Express),
   `Conversation`/`Message` models (namespaced separately from the AI chat ones).
7. **Feature 7 — Notifications** — extends the *existing* `Notification` model
   and `NotificationContext`/`useNotifications` rather than replacing them;
   adds Socket.IO push on top of the current poll/fetch pattern.
8. **Feature 8 — Email (Nodemailer)** — `src/services/emailService.js` +
   templates, called from existing controllers at the points already listed.
9. **Feature 9 — Interview Management** — `Interview` model, ties into
   Notifications (7) and Email (8).
10. **Feature 10 — Admin AI Dashboard** — read-only aggregation endpoints on
    top of existing collections; added to `AdminDashboard/Overview.jsx`.
11. **Feature 11 — Security hardening** — mostly already present
    (`helmet`, `express-mongo-sanitize`, `xss-clean`, `express-rate-limit`
    are already in `package.json`/`server.js`); this phase just applies
    rate limits to the new AI/upload endpoints specifically, since they're
    the most expensive to abuse.

Each phase ships as: new model(s) → controller → routes → `server.js`
one-line route mount → frontend service → frontend page/component →
confirmation the app still builds.

---

# Phase 1 (this message): AI Career Chatbot — backend

## New files
- `src/config/openai.js`
- `src/services/aiService.js`
- `src/models/ChatConversation.js`
- `src/models/ChatMessage.js`
- `src/controllers/chatbotController.js`
- `src/routes/chatbotRoutes.js`
- `src/middleware/aiRateLimit.js` (scoped rate limit, doesn't touch global one)

## Modified files (additive lines only)
- `src/server.js` — mount `/api/v1/chatbot`
- `package.json` — add `openai`, `pdf-parse`, `mammoth` to dependencies

## Endpoints
- `POST   /api/v1/chatbot/conversations` — create conversation
- `GET    /api/v1/chatbot/conversations` — list current user's conversations
- `DELETE /api/v1/chatbot/conversations/:id` — delete
- `GET    /api/v1/chatbot/conversations/:id/messages` — history
- `POST   /api/v1/chatbot/conversations/:id/messages` — send message, **streams**
  the AI reply back as `text/event-stream` (SSE) so the frontend can render
  a typing/streaming effect without a websocket dependency for this feature
- `POST   /api/v1/chatbot/conversations/:id/upload` — attach PDF/DOCX/image,
  extracted text is folded into the next message's context

Scope guard: the system prompt restricts the assistant to recruitment topics
(resume, interview prep, career, salary negotiation, etc.) and the endpoint is
`protect`-only (any authenticated role: candidate, company, or admin) — not
role-restricted, since all three roles benefit from career guidance.
