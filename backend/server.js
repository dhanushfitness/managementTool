import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';

// Import routes
import authRoutes from './routes/auth.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import memberRoutes from './routes/member.routes.js';
import planRoutes from './routes/plan.routes.js';
import serviceRoutes from './routes/service.routes.js';
import setupChecklistRoutes from './routes/setupChecklist.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import staffRoutes from './routes/staff.routes.js';
import reportRoutes from './routes/report.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import enquiryRoutes from './routes/enquiry.routes.js';
import marketingRoutes from './routes/marketing.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import adminRoutes from './routes/admin.routes.js';
import centralPanelRoutes from './routes/centralPanel.routes.js';
import followupRoutes from './routes/followup.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import clientManagementRoutes from './routes/clientManagement.routes.js';
import exerciseRoutes, { memberExerciseRoutes } from './routes/exercise.routes.js';
import memberAuthRoutes from './routes/memberAuth.routes.js';
import { handleError } from './utils/errorHandler.js';

// Load environment variables
dotenv.config();

// Validate environment variables
import { validateEnv } from './utils/envValidator.js';
validateEnv(false); // false = non-strict mode (warnings only)

const app = express();

// Compression middleware - compress all responses
app.use(compression());

// Security middleware
app.use(helmet());
// CORS configuration - allow frontend from Netlify or localhost
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:8080',
  'https://*.netlify.app'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins
    if (allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, restrict in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Static files for exercises
app.use('/exercises', express.static(path.join(process.cwd(), 'exercises')));

// Logging middleware - Morgan
if (process.env.NODE_ENV === 'development') {
  // Development: detailed colored output
  app.use(morgan('dev'));
} else {
  // Production: Apache combined log format for better analytics
  app.use(morgan('combined'));
}

// Request logging - only in development
// if (process.env.NODE_ENV === 'development') {
//   app.use((req, res, next) => {
//     console.log('REQ', {
//       method: req.method,
//       url: req.originalUrl,
//       ip: req.ip,
//       headers: {
//         'x-forwarded-for': req.headers['x-forwarded-for'],
//         'user-agent': req.headers['user-agent'],
//         host: req.headers.host
//       },
//       body: req.body && Object.keys(req.body).length ? req.body : undefined
//     });
//     next();
//   });
// }


// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/clients', memberRoutes); // Alias for clients
app.use('/api/plans', planRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/setup-checklist', setupChecklistRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/central-panel', centralPanelRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/client-management', clientManagementRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/member/exercises', memberExerciseRoutes);
app.use('/api/member-auth', memberAuthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  handleError(err, res, err.status || 500);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Connect to MongoDB with optimized connection pooling
const mongoOptions = {
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Minimum number of connections in the pool
  serverSelectionTimeoutMS: 5000, // How long to wait for server selection
  socketTimeoutMS: 45000, // How long to wait for socket operations
  connectTimeoutMS: 10000, // How long to wait for initial connection
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  retryWrites: true, // Retry writes on transient errors
  retryReads: true, // Retry reads on transient errors
  bufferCommands: false, // Disable mongoose buffering
};

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
.then(async() => {
  console.log('✅ MongoDB connected successfully');
  
  // Initialize cron jobs after MongoDB connection
  if (process.env.ENABLE_CRON_JOBS !== 'false') {
    try {
      const { initializeCronJobs } = await import('./jobs/membershipExpiry.js');
      initializeCronJobs();
      
      const { initializeDailyCronJobs } = await import('./jobs/dailyCronJobs.js');
      initializeDailyCronJobs();
      
      console.log('✅ All cron jobs initialized');
    } catch (error) {
      console.error('❌ Failed to initialize cron jobs:', error);
    }
  }
  
  // Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

export default app;

