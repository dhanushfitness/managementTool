import dotenv from 'dotenv';
import { sendEmail } from '../utils/email.js';

// Load environment variables
dotenv.config({ path: './.env' });

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');

  // Check configuration
  console.log('📋 Configuration Check:');
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET'}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER || 'NOT SET'}`);
  console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET'}`);
  console.log('');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ Email configuration is incomplete!');
    console.error('   Please check your .env file and ensure all SMTP variables are set.');
    process.exit(1);
  }

  // Validate SendGrid configuration
  if (process.env.SMTP_HOST === 'smtp.sendgrid.net') {
    if (process.env.SMTP_USER !== 'apikey') {
      console.error('❌ For SendGrid, SMTP_USER must be exactly "apikey"');
      console.error(`   Current value: "${process.env.SMTP_USER}"`);
      process.exit(1);
    }
    if (!process.env.SMTP_PASSWORD.startsWith('SG.')) {
      console.warn('⚠️  Warning: SendGrid API key should start with "SG."');
      console.warn(`   Current value starts with: "${process.env.SMTP_PASSWORD.substring(0, 3)}"`);
    }
  }

  // Get test email from user or use a default
  const testEmail = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';
  
  console.log(`📧 Sending test email to: ${testEmail}\n`);

  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'Test Email from Gym Management System',
      html: `
        <h2>✅ Email Test Successful!</h2>
        <p>If you received this email, your SendGrid configuration is working correctly.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>SMTP Host: ${process.env.SMTP_HOST}</li>
          <li>SMTP Port: ${process.env.SMTP_PORT}</li>
          <li>SMTP User: ${process.env.SMTP_USER}</li>
        </ul>
        <p>Your email system is ready to send invoice notifications and membership expiry reminders!</p>
      `,
      text: 'Test Email from Gym Management System - If you received this, your email configuration is working!'
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log('\n🎉 Your email configuration is working correctly!');
      console.log('   Check your inbox (and spam folder) for the test email.');
    } else {
      console.error('❌ Failed to send email:');
      console.error(`   Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error sending test email:');
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error(`   Response: ${JSON.stringify(error.response, null, 2)}`);
    }
    process.exit(1);
  }
}

testEmail();

