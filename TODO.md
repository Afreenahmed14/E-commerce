# AI Features — Implementation TODO

## Backend (COMPLETE ✓)
- [x] Feature 1: AI Career Assistant chatbot (controllers/services/routes/models)
- [x] Feature 2: ATS Resume Checker (atsController, atsRoutes, atsService, ResumeAnalysis)
- [x] Feature 3: AI Job Matching (jobMatchService)
- [x] Feature 4: Company<->Candidate realtime chat (Conversation, Message, socket/index)
- [x] Feature 5: Job Application Questions (JobQuestion, ApplicationAnswer, mcqController)
- [x] Feature 6: AI auto-generated MCQs (mcqService)
- [x] Feature 7: Realtime notifications (notificationHelper, socket)
- [x] Feature 8: Email notifications (emailService, nodemailer)
- [x] Feature 9: Interview management (Interview, interviewController)
- [x] Feature 10: Admin AI dashboard (adminInsightsController)
- [x] Server.js: http.createServer + Socket.IO init + setIo + all routes registered
- [x] Added socket.io dependency + npm install

## Frontend (IN PROGRESS)
- [ ] Install deps (socket.io-client, react-markdown, remark-gfm, rehype-highlight)
- [ ] Create frontend services (chatbot, ats, conversation, interview, mcq, adminInsights)
- [ ] Set up socket.io client context
- [ ] AI Career Assistant chatbot page + streaming UI
- [ ] ATS Resume Checker page (upload, score, suggestions, improved resume download)
- [ ] Job Matching results (integrated into ATS + candidate dashboard)
- [ ] Company<->Candidate chat page (list, messages, typing, read receipts, attachments)
- [ ] Job application questionnaire (apply modal in JobDetails)
- [ ] Recruiter question manager (manual + AI generate + edit) in PostJob/MyJobs
- [ ] Interview management page (candidate + company)
- [ ] Realtime notifications dropdown (socket)
- [ ] Admin AI dashboard page
- [ ] Dashboard nav + routes for all new pages
- [ ] Verify frontend build passes
