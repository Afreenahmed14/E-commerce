require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { startSubscriptionExpiryJob } = require('./jobs/subscriptionExpiryJob');
const { loadPricingOverrides } = require('./utils/loadPricingOverrides');

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

// ---- Error Handling ----
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await loadPricingOverrides();

    app.listen(PORT, () => {
      console.log(
        `[Server] HourlyRecruit API listening on port ${PORT} (${process.env.NODE_ENV})`
      );
    });

    if (process.env.NODE_ENV !== 'test') {
      startSubscriptionExpiryJob();
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