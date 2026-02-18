import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';

// Routes
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
import memberAuthRoutes from './routes/memberAuth.routes.js';
import { handleError } from './utils/errorHandler.js';

// Load env
dotenv.config();

const app = express();

/* ---------------------------------------------------
   BASIC MIDDLEWARE
--------------------------------------------------- */
app.use(compression());
// Configure helmet to allow cross-origin images and static files
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5000", "https:", "http:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

/* ---------------------------------------------------
   CORS (🔥 FIXED & CORRECT)
--------------------------------------------------- */
// Debug middleware to log all requests (for CORS debugging)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    console.log(`📥 ${req.method} ${req.path} - Origin: ${origin}`);
  }
  next();
});

// Get allowed origins from environment or use defaults
const getAllowedOrigins = () => {
  const origins = [];
  
  // Add from environment variable (comma-separated)
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }
  
  // Add from FRONTEND_URL if set
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
    // Also add http version if https
    if (process.env.FRONTEND_URL.startsWith('https://')) {
      origins.push(process.env.FRONTEND_URL.replace('https://', 'http://'));
    }
  }
  
  // Add default origins
  const defaultOrigins = [
    "https://app.airfitluxury.in",          // Production frontend
    "http://app.airfitluxury.in",   
    "https://dhanushcrmfrontend.netlify.app/",        // Production frontend (http fallback)
    'http://localhost:8080',                // CRA
    'http://localhost:5173',                // Vite
    'http://localhost:3000',                // Alternative dev port
  ];
  
  origins.push(...defaultOrigins);
  
  // Remove duplicates and filter out empty values
  return [...new Set(origins.filter(Boolean))];
};

const allowedOrigins = [...new Set(getAllowedOrigins().map((origin) => origin.replace(/\/$/, '')))];

app.use(cors({
  origin: function (origin, callback) {
    // allow server-to-server / curl / mobile apps / Postman
    if (!origin) {
      console.log('CORS: No origin (server-to-server request), allowing');
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');

    // Exact origin allow-list check
    if (allowedOrigins.includes(normalizedOrigin)) {
      console.log(`CORS: Allowing origin: ${origin}`);
      return callback(null, true);
    }

    console.log(`CORS blocked origin: ${origin}`);
    console.log('Allowed origins:', allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// 🔥 REQUIRED for browser preflight - handle all OPTIONS requests
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log(`OPTIONS request from origin: ${origin}`);

  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      console.log(`OPTIONS: Allowing origin: ${origin}`);
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      return res.sendStatus(200);
    }

    console.log(`OPTIONS: Blocked origin: ${origin}`);
    console.log('Allowed origins:', allowedOrigins);
  }

  // Keep browser preflight behavior stable
  res.sendStatus(200);
});

/* ---------------------------------------------------
   RATE LIMIT ( OPTIONS FIX)
--------------------------------------------------- */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,//15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === 'OPTIONS' ||   //  allow preflight
    req.path === '/health' ||
    req.path === '/api/health'
});

app.use('/api/', limiter);

/* ---------------------------------------------------
   BODY PARSERS
--------------------------------------------------- */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ---------------------------------------------------
   STATIC FILES
--------------------------------------------------- */
// Middleware to add CORS headers to static files
const staticOptions = {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
};

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), staticOptions));

/* ---------------------------------------------------
   LOGGING
--------------------------------------------------- */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/* ---------------------------------------------------
   HEALTH CHECK
--------------------------------------------------- */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  const origin = req.headers.origin;
  res.status(200).json({
    success: true,
    message: 'CORS is working!',
    origin: origin,
    allowedOrigins: allowedOrigins,
    timestamp: new Date().toISOString()
  });
});

/* ---------------------------------------------------
   API ROUTES
--------------------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/clients', memberRoutes);
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
app.use('/api/member-auth', memberAuthRoutes);

/* ---------------------------------------------------
   ERROR HANDLING
--------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error(err);
  handleError(err, res, err.status || 500);
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

/* ---------------------------------------------------
   DATABASE + SERVER START
--------------------------------------------------- */
const mongoOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
  bufferCommands: false,
};

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => {
    console.log('✅ MongoDB connected');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 CORS allowed origins:`, allowedOrigins);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error', err);
    process.exit(1);
  });

export default app;


