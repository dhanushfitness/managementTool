/**
 * Environment Variable Validation Utility
 * Validates required and optional environment variables at startup
 */

// Required environment variables (server won't start without these)
const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_SECRET'
];

// Optional but recommended environment variables
const RECOMMENDED_VARS = {
  // Payment Gateway
  'RAZORPAY_KEY_ID': 'Required for payment processing',
  'RAZORPAY_KEY_SECRET': 'Required for payment processing',
  
  // Email
  'SMTP_USER': 'Required for email notifications',
  'SMTP_PASSWORD': 'Required for email notifications',
  
  // SMS (at least one provider)
  'MSG91_AUTH_KEY': 'Required for SMS notifications (MSG91)',
  'TWILIO_ACCOUNT_SID': 'Required for SMS notifications (Twilio)',
  
  // WhatsApp (optional)
  'WHATSAPP_API_KEY': 'Required for WhatsApp notifications',
};

/**
 * Validate environment variables
 * @param {boolean} strict - If true, throws error on missing required vars
 * @returns {Object} Validation result with warnings and errors
 */
export const validateEnv = (strict = false) => {
  const errors = [];
  const warnings = [];
  const info = [];

  console.log('\n🔍 Validating Environment Configuration...\n');

  // Check required variables
  REQUIRED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`❌ Missing required variable: ${varName}`);
    } else {
      info.push(`✅ ${varName}: Configured`);
    }
  });

  // Check recommended variables
  const emailConfigured = process.env.SMTP_USER && process.env.SMTP_PASSWORD;
  const smsConfigured = process.env.MSG91_AUTH_KEY || 
                        (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  const razorpayConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
  const whatsappConfigured = process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Payment Gateway
  if (!razorpayConfigured) {
    warnings.push(`⚠️  Razorpay not configured - Payment processing will not work`);
  } else {
    info.push(`✅ Razorpay: Configured`);
  }

  // Email
  if (!emailConfigured) {
    warnings.push(`⚠️  SMTP not configured - Email notifications will not work`);
  } else {
    info.push(`✅ Email (SMTP): Configured`);
  }

  // SMS
  if (!smsConfigured) {
    warnings.push(`⚠️  SMS provider not configured - SMS notifications will not work`);
  } else {
    if (process.env.MSG91_AUTH_KEY) {
      info.push(`✅ SMS (MSG91): Configured`);
    }
    if (process.env.TWILIO_ACCOUNT_SID) {
      info.push(`✅ SMS (Twilio): Configured`);
    }
  }

  // WhatsApp
  if (whatsappConfigured) {
    info.push(`✅ WhatsApp: Configured`);
  } else {
    info.push(`ℹ️  WhatsApp: Not configured (optional)`);
  }

  // Display results
  if (info.length > 0) {
    console.log('Configuration Status:');
    info.forEach(msg => console.log(`  ${msg}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(msg => console.log(`  ${msg}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(msg => console.log(`  ${msg}`));
    console.log('');
  }

  // Check for common mistakes
  checkCommonMistakes();

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables are properly configured!\n');
  } else if (errors.length === 0) {
    console.log('⚠️  Server will start but some features may not work.\n');
    console.log('💡 Tip: Check backend/.env.example for all available variables.\n');
  }

  // Throw error if strict mode and there are errors
  if (strict && errors.length > 0) {
    throw new Error(`Environment validation failed. Please check your .env file.`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    info
  };
};

/**
 * Check for common configuration mistakes
 */
const checkCommonMistakes = () => {
  const mistakes = [];

  // Check if JWT_SECRET is still default
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('change_this')) {
    mistakes.push(`⚠️  JWT_SECRET appears to be a default value. Change it for security!`);
  }

  // Check if JWT_SECRET is too short
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    mistakes.push(`⚠️  JWT_SECRET is too short. Use at least 32 characters for security.`);
  }

  // Check SendGrid specific config
  if (process.env.SMTP_HOST === 'smtp.sendgrid.net' && process.env.SMTP_USER === 'apikey') {
    if (!process.env.SMTP_FROM) {
      mistakes.push(`⚠️  SendGrid requires SMTP_FROM to be set to a verified sender email.`);
    }
  }

  // Check SMTP_SECURE vs PORT mismatch
  if (process.env.SMTP_PORT === '465' && process.env.SMTP_SECURE !== 'true') {
    mistakes.push(`⚠️  SMTP_PORT is 465 but SMTP_SECURE is not 'true'. This may cause issues.`);
  }

  if (process.env.SMTP_PORT === '587' && process.env.SMTP_SECURE === 'true') {
    mistakes.push(`⚠️  SMTP_PORT is 587 but SMTP_SECURE is 'true'. Set SMTP_SECURE to 'false'.`);
  }

  // Check MSG91 configuration
  if (process.env.MSG91_AUTH_KEY && !process.env.MSG91_SENDER_ID) {
    mistakes.push(`ℹ️  MSG91_SENDER_ID not set. Will use default 'GYMMGT'.`);
  }

  if (mistakes.length > 0) {
    console.log('Common Issues:');
    mistakes.forEach(msg => console.log(`  ${msg}`));
    console.log('');
  }
};

/**
 * Get missing required variables
 * @returns {Array} List of missing required variable names
 */
export const getMissingRequiredVars = () => {
  return REQUIRED_VARS.filter(varName => !process.env[varName]);
};

/**
 * Check if all required variables are set
 * @returns {boolean} True if all required vars are set
 */
export const hasRequiredVars = () => {
  return getMissingRequiredVars().length === 0;
};

export default validateEnv;

