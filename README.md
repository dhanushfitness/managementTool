# SaaS Gym Management & Billing Platform

A comprehensive SaaS platform for gyms and fitness studios to manage memberships, billing, attendance, and communications.

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Razorpay Integration
- WhatsApp Business API

### Frontend
- React 18
- Vite
- React Router
- TanStack Query (React Query)
- Zustand (State Management)
- Tailwind CSS
- Lucide React (Icons)

## Features

### Core Features (P0)
- ✅ Multi-tenant architecture with organization isolation
- ✅ Role-based access control (Owner, Manager, Staff, Accountant)
- ✅ Member management with profiles and membership tracking
- ✅ Membership plans with flexible pricing and duration
- ✅ Invoice generation and management
- ✅ Payment processing via Razorpay (cards, UPI, QR codes)
- ✅ Attendance tracking (manual and biometric)
- ✅ Dashboard with KPIs and analytics
- ✅ Staff management and scheduling

### Additional Features (P1/P2)
- ✅ WhatsApp notifications for renewals and payments
- ✅ Financial and member reports
- ✅ Audit logging
- ✅ Webhook handling for Razorpay and WhatsApp

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- Razorpay account (for payments)
- WhatsApp Business API access (optional)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gym_management
JWT_SECRET=your_super_secret_jwt_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
FRONTEND_URL=http://localhost:5173
```

5. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

### Running Both Together

From the root directory:
```bash
npm run install:all  # Install all dependencies
npm run dev          # Start both backend and frontend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new organization
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Members
- `GET /api/members` - List members
- `POST /api/members` - Create member
- `GET /api/members/:id` - Get member details
- `PUT /api/members/:id` - Update member
- `POST /api/members/:id/enroll` - Enroll member in plan
- `POST /api/members/:id/renew` - Renew membership

### Plans
- `GET /api/plans` - List plans
- `POST /api/plans` - Create plan
- `PUT /api/plans/:id` - Update plan

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `GET /api/invoices/:id/download` - Download invoice PDF

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Create payment
- `POST /api/payments/razorpay` - Process Razorpay payment
- `POST /api/payments/payment-link` - Create payment link

### Attendance
- `POST /api/attendance/checkin` - Check in member
- `GET /api/attendance` - List attendance records

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/renewals` - Get upcoming renewals
- `GET /api/dashboard/pending-payments` - Get pending payments

### Reports
- `GET /api/reports/financial` - Financial report
- `GET /api/reports/members` - Member report
- `GET /api/reports/operational` - Operational report

## Database Models

- **Organization** - Gym/studio organization
- **Branch** - Multiple locations
- **User** - Staff members with roles
- **Member** - Gym members
- **Plan** - Membership plans
- **Invoice** - Billing invoices
- **Payment** - Payment records
- **Attendance** - Check-in/check-out records
- **Discount** - Coupons and discounts
- **AuditLog** - Activity tracking
- **WebhookEvent** - Webhook processing

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Helmet.js for security headers
- Input validation with express-validator
- CORS configuration

## Payment Integration

### Razorpay
- Payment links
- Card, UPI, and wallet payments
- Subscription management
- Refunds
- Webhook handling for payment events

## WhatsApp Integration

- Template-based messaging
- Payment reminders
- Renewal notifications
- Welcome messages
- Payment confirmations

## Development

The project follows a modular structure:

```
backend/
  ├── models/          # MongoDB models
  ├── routes/          # API routes
  ├── controllers/     # Business logic
  ├── middleware/      # Auth and validation
  └── utils/           # Helper functions

frontend/
  ├── src/
  │   ├── pages/       # Page components
  │   ├── components/   # Reusable components
  │   ├── api/         # API client functions
  │   └── store/       # State management
```

## License

MIT

## Support

For issues and questions, please open an issue on the repository.

