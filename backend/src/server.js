// require('dotenv').config();

// const dns = require('dns');
// dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? "Loaded ✅" : "Missing ❌");
console.log("GROQ_MODEL:", process.env.GROQ_MODEL || "Not Set");
console.log("Current Working Directory:", process.cwd());

const Groq = require("groq-sdk");

const groqTest = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

(async () => {
  try {
    await groqTest.models.list();
    console.log("🔥 GROQ AUTH TEST: SUCCESS ✅");
  } catch (error) {
    console.error("🔥 GROQ AUTH TEST: FAILED ❌");
    console.error("Status:", error.status);
    console.error("Message:", error.message);
  }
})();


const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const http = require('http');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { startSubscriptionExpiryJob } = require('./jobs/subscriptionExpiryJob');
const { startMeetingReminderJob } = require('./jobs/meetingReminderJob');
const { loadPricingOverrides } = require('./utils/loadPricingOverrides');
const { initSocket } = require('./socket');
const { setIo } = require('./services/notificationHelper');

// Route modules
const authRoutes = require('./routes/authRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const companyRoutes = require('./routes/companyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const otpRoutes = require('./routes/otpRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const taxonomyRoutes = require('./routes/taxonomyRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes'); // Feature 1: AI Career Assistant
const atsRoutes = require('./routes/atsRoutes'); // Feature 2: ATS Resume Checker
const conversationRoutes = require('./routes/conversationRoutes'); // Feature 4: Company <-> Candidate Chat
const mcqRoutes = require('./routes/mcqRoutes'); // Features 5 & 6: Job Application Questions + AI-generated MCQs
const interviewRoutes = require('./routes/interviewRoutes'); // Feature 9: Interview Management
const partnerMeetingRoutes = require('./routes/partnerMeetingRoutes'); // Feature 9b: Candidate <-> Project Partner meetings
const adminInsightsRoutes = require('./routes/adminInsightsRoutes'); // Feature 10: Admin AI Dashboard

const app = express();

// Trust Render's reverse proxy
app.set('trust proxy', 1);

// ---- Security & Parsing Middleware ----
app.use(helmet({
  // Default 'same-origin' COOP blocks the Razorpay checkout popup script
  // from polling `window.closed` on the popup it opens, which spams the
  // console with "Cross-Origin-Opener-Policy policy would block the
  // window.closed call." warnings. 'same-origin-allow-popups' keeps the
  // isolation benefits for our own origin but lets us retain a reference
  // to (and poll) popups we open ourselves, like the Razorpay window.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());

if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')
  );
}

// ---- Health Check ----
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HourlyRecruit API is running',
    data: {
      timestamp: new Date(),
    },
    errors: [],
  });
});

// ---- API Routes ----
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/taxonomy', taxonomyRoutes);
app.use('/api/v1/chatbot', chatbotRoutes); // Feature 1: AI Career Assistant
app.use('/api/v1/ats', atsRoutes); // Feature 2: ATS Resume Checker
app.use('/api/v1/conversations', conversationRoutes); // Feature 4: Company <-> Candidate Chat
app.use('/api/v1/companies', mcqRoutes); // Features 5 & 6: Job Application Questions (company management)
app.use('/api/v1/interviews', interviewRoutes); // Feature 9: Interview Management
app.use('/api/v1/partner-meetings', partnerMeetingRoutes); // Feature 9b: Candidate <-> Project Partner meetings
app.use('/api/v1/admin-insights', adminInsightsRoutes); // Feature 10: Admin AI Dashboard

// ---- Error Handling ----
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await loadPricingOverrides();

    // Create an HTTP server and attach Socket.IO for realtime features
    // (chat, presence, notifications) — see socket/index.js.
    const server = http.createServer(app);
    const io = initSocket(server);
    setIo(io); // let notificationHelper push realtime events

    server.listen(PORT, () => {
      console.log(
        `[Server] HourlyRecruit API + Socket.IO listening on port ${PORT} (${process.env.NODE_ENV})`
      );
    });

    if (process.env.NODE_ENV !== 'test') {
      startSubscriptionExpiryJob();
      startMeetingReminderJob();
    }
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown
process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err);
  process.exit(1);
});

module.exports = app;
