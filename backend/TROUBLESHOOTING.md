# Troubleshooting Backend Server Issues

## Common Errors and Solutions

### 1. MongoDB Connection Error
**Error:** `MongooseError: connect ECONNREFUSED`

**Solution:**
- Make sure MongoDB is running on your system
- Check if MongoDB is installed: `mongod --version`
- Start MongoDB service:
  - Windows: Start MongoDB service from Services
  - Linux/Mac: `sudo systemctl start mongod` or `brew services start mongodb-community`
- Verify connection string in `.env` file

### 2. Missing Environment Variables
**Error:** `JWT_SECRET is not defined` or similar

**Solution:**
- Copy `.env.example` to `.env`: `cp .env.example .env`
- Update all required values in `.env` file
- At minimum, set:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `PORT` (optional, defaults to 5000)

### 3. Module Not Found Errors
**Error:** `Cannot find module '...'`

**Solution:**
- Install dependencies: `npm install`
- Check if all packages in `package.json` are installed
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

### 4. Port Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
- Change PORT in `.env` file to a different port (e.g., 5001)
- Or kill the process using port 5000:
  - Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`
  - Linux/Mac: `lsof -ti:5000 | xargs kill`

### 5. Import/Export Errors
**Error:** `SyntaxError: Cannot use import statement outside a module`

**Solution:**
- Make sure `package.json` has `"type": "module"`
- Check all files use `.js` extension in imports
- Ensure ES6 module syntax is used (`import/export` not `require/module.exports`)

### 6. Validation Errors
**Error:** `express-validator` validation errors

**Solution:**
- Check validation rules in route files
- Ensure request body matches expected format
- Check validation error messages in response

### 7. Razorpay Initialization Errors
**Error:** Razorpay related errors (if using payment features)

**Solution:**
- Add Razorpay keys to `.env` file:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
- These can be empty strings for testing without payments
- Server will still start without Razorpay keys, but payment features won't work

## Quick Start Checklist

1. ✅ MongoDB is installed and running
2. ✅ `.env` file exists with required variables
3. ✅ Dependencies installed: `npm install`
4. ✅ Server starts: `npm run dev` or `node server.js`

## Testing Server

1. Health check: `curl http://localhost:5000/health`
2. Should return: `{"status":"OK","timestamp":"..."}`

## Getting Help

If issues persist:
1. Check server logs for specific error messages
2. Verify MongoDB connection
3. Check all environment variables are set
4. Ensure all dependencies are installed

