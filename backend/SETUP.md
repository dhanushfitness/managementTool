# Backend Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Create Environment File**
   ```bash
   cp .env.example .env
   ```

3. **Configure Environment Variables**
   Edit `.env` file with your settings:
   - `MONGODB_URI` - MongoDB connection string (required)
   - `JWT_SECRET` - Secret key for JWT tokens (required)
   - `PORT` - Server port (default: 5000)
   - `RAZORPAY_KEY_ID` - Razorpay key (optional, for payments)
   - `RAZORPAY_KEY_SECRET` - Razorpay secret (optional, for payments)

4. **Start MongoDB**
   - Make sure MongoDB is running on your system
   - Default connection: `mongodb://localhost:27017/gym_management`

5. **Start Server**
   ```bash
   npm run dev
   # or
   node server.js
   ```

## Fixed Issues

### ✅ Fixed Naming Conflict
- Fixed `createPaymentLink` function naming conflict in payment controller
- Now uses `createRazorpayPaymentLink` from utils

### ✅ Fixed MongoDB Connection
- Removed deprecated connection options (`useNewUrlParser`, `useUnifiedTopology`)
- Updated to use modern Mongoose connection

### ✅ Fixed Validation
- Added locale parameter to `isMobilePhone` validator
- Added proper validation error handling

### ✅ Removed Unused Imports
- Removed unused `createObjectCsvWriter` import from report controller

## Common Errors

### MongoDB Connection Failed
**Error:** `MongooseError: connect ECONNREFUSED`

**Solution:**
- Start MongoDB service
- Check MongoDB URI in `.env`
- Verify MongoDB is listening on correct port

### Missing JWT_SECRET
**Error:** `JWT_SECRET is not defined`

**Solution:**
- Add `JWT_SECRET` to `.env` file
- Use a strong random string (minimum 32 characters)

### Port Already in Use
**Error:** `EADDRINUSE: address already in use`

**Solution:**
- Change PORT in `.env` to different port
- Or kill the process using the port

### Module Not Found
**Error:** `Cannot find module`

**Solution:**
- Run `npm install` again
- Check if all dependencies are in `package.json`

## Testing

1. **Health Check**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"OK","timestamp":"..."}`

2. **Test Registration**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "phone": "+1234567890",
       "firstName": "Test",
       "lastName": "User",
       "organizationName": "Test Gym",
       "branchName": "Main Branch"
     }'
   ```

## Project Structure

```
backend/
├── models/          # MongoDB schemas
├── routes/          # API route definitions
├── controllers/     # Business logic
├── middleware/      # Auth & validation
├── utils/           # Helper functions
└── server.js        # Entry point
```

## Next Steps

1. Configure Razorpay (optional)
2. Set up WhatsApp integration (optional)
3. Test all API endpoints
4. Set up frontend connection

