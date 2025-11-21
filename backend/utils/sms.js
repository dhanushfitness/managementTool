import axios from 'axios';

// SMS Service Integration
// Supports multiple providers: Twilio, AWS SNS, MSG91, etc.

/**
 * Send SMS using configured provider
 * @param {string} to - Phone number (with country code, e.g., +919876543210)
 * @param {string} message - SMS message content
 * @param {string} provider - SMS provider ('twilio', 'aws', 'msg91', 'default')
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendSMS = async (to, message, provider = 'default') => {
  try {
    // Remove any spaces or special characters from phone number
    const cleanPhone = to.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Ensure phone number starts with +
    const phoneNumber = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    switch (provider) {
      case 'twilio':
        return await sendViaTwilio(phoneNumber, message);
      case 'aws':
        return await sendViaAWS(phoneNumber, message);
      case 'msg91':
        return await sendViaMSG91(phoneNumber, message);
      default:
        return await sendViaDefault(phoneNumber, message);
    }
  } catch (error) {
    console.error('SMS send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
};

/**
 * Send SMS via Twilio
 */
const sendViaTwilio = async (to, message) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.sid
    };
  } catch (error) {
    console.error('Twilio SMS error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Send SMS via AWS SNS
 * 
 * IMPLEMENTATION NOTE:
 * AWS SNS SMS requires the AWS SDK to be installed and configured.
 * 
 * To implement AWS SNS SMS:
 * 1. Install AWS SDK: npm install @aws-sdk/client-sns
 * 2. Configure AWS credentials in .env:
 *    AWS_REGION=your-region
 *    AWS_ACCESS_KEY_ID=your-access-key
 *    AWS_SECRET_ACCESS_KEY=your-secret-key
 * 3. Implement the sendViaAWS function below
 * 
 * Example implementation:
 * ```javascript
 * import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
 * 
 * const snsClient = new SNSClient({
 *   region: process.env.AWS_REGION,
 *   credentials: {
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
 *   }
 * });
 * 
 * const params = {
 *   Message: message,
 *   PhoneNumber: to,
 *   MessageAttributes: {
 *     'AWS.SNS.SMS.SMSType': {
 *       DataType: 'String',
 *       StringValue: 'Transactional'
 *     }
 *   }
 * };
 * 
 * const command = new PublishCommand(params);
 * const response = await snsClient.send(command);
 * ```
 */
const sendViaAWS = async (to, message) => {
  console.warn('⚠️  AWS SNS SMS is not implemented in this version.');
  console.warn('   To use AWS SNS, implement the sendViaAWS function in backend/utils/sms.js');
  console.warn('   See function comments for implementation guide.');
  
  return {
    success: false,
    error: 'AWS SNS SMS is not implemented. Use MSG91 or Twilio instead, or implement AWS SNS following the guide in backend/utils/sms.js'
  };
};

/**
 * Send SMS via MSG91 (Popular in India)
 * MSG91 API Documentation: https://api.msg91.com/apidoc/textsms/send-sms-v1.php
 */
const sendViaMSG91 = async (to, message) => {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const senderId = process.env.MSG91_SENDER_ID || 'GymMgt';

    if (!authKey) {
      // Debug information
      console.error('MSG91 Configuration Error:');
      console.error('- MSG91_AUTH_KEY is not set in environment variables');
      console.error('- Make sure .env file is in backend/ directory');
      console.error('- Variable name must be exactly: MSG91_AUTH_KEY');
      console.error('- Restart backend server after adding to .env');
      throw new Error('MSG91 credentials not configured. Please set MSG91_AUTH_KEY in .env file');
    }

    // Remove + from phone number for MSG91 and ensure it's in correct format
    // MSG91 expects: 91XXXXXXXXXX (country code + 10 digit number)
    let phoneNumber = to.replace(/[^\d]/g, ''); // Remove all non-digits
    
    // If phone number doesn't start with country code, assume it's Indian number
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }

    // MSG91 API v2 endpoint
    const response = await axios.post(
      'https://api.msg91.com/api/v2/sendsms',
      {
        sender: senderId,
        route: '4', // Route 4 = Transactional SMS
        country: '91', // India country code
        sms: [
          {
            message: message,
            to: [phoneNumber]
          }
        ]
      },
      {
        headers: {
          'authkey': authKey,
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if response indicates success
    if (response.data && response.data.type === 'success') {
      return {
        success: true,
        messageId: response.data.request_id || response.data.message || 'MSG91-' + Date.now()
      };
    } else {
      throw new Error(response.data.message || 'MSG91 API returned an error');
    }
  } catch (error) {
    console.error('MSG91 SMS error:', error.response?.data || error.message);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Default SMS provider (can be configured via environment variables)
 * This is a generic implementation that can be adapted to any provider
 */
const sendViaDefault = async (to, message) => {
  try {
    // Check if a custom SMS API URL is configured
    const smsApiUrl = process.env.SMS_API_URL;
    const smsApiKey = process.env.SMS_API_KEY;

    if (smsApiUrl && smsApiKey) {
      const response = await axios.post(
        smsApiUrl,
        {
          to: to,
          message: message,
          // Add any other required fields based on your provider
        },
        {
          headers: {
            'Authorization': `Bearer ${smsApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.id || response.data.messageId || Date.now().toString()
      };
    }

    // If no provider is configured, log and return success (for development)
    console.log('SMS Provider not configured. SMS would be sent to:', to);
    console.log('Message:', message);
    
    // In development, you might want to return success to test the flow
    // In production, this should throw an error
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMS provider not configured. Please set SMS_API_URL and SMS_API_KEY in environment variables.');
    }

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
      note: 'SMS not actually sent (development mode)'
    };
  } catch (error) {
    console.error('Default SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send payment link via SMS
 * @param {string} phoneNumber - Member's phone number
 * @param {string} memberName - Member's name
 * @param {string} paymentLink - Payment link URL
 * @param {number} amount - Payment amount
 * @param {string} invoiceNumber - Invoice number
 * @param {string} provider - SMS provider to use
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendPaymentLinkSMS = async (
  phoneNumber,
  memberName,
  paymentLink,
  amount,
  invoiceNumber,
  provider = 'default'
) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);

  const message = `Hi ${memberName},\n\nPayment due for Invoice ${invoiceNumber}: ${formattedAmount}\n\nPay now: ${paymentLink}\n\nThank you!`;

  return await sendSMS(phoneNumber, message, provider);
};

/**
 * Send payment reminder via SMS
 */
export const sendPaymentReminderSMS = async (
  phoneNumber,
  memberName,
  paymentLink,
  amount,
  invoiceNumber,
  dueDate,
  provider = 'default'
) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);

  const dueDateStr = new Date(dueDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const message = `Hi ${memberName},\n\nPayment reminder for Invoice ${invoiceNumber}: ${formattedAmount}\nDue Date: ${dueDateStr}\n\nPay now: ${paymentLink}\n\nThank you!`;

  return await sendSMS(phoneNumber, message, provider);
};

/**
 * Send payment confirmation via SMS
 */
export const sendPaymentConfirmationSMS = async (
  phoneNumber,
  memberName,
  amount,
  invoiceNumber,
  receiptNumber,
  provider = 'default'
) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);

  const message = `Hi ${memberName},\n\nPayment confirmed!\nInvoice: ${invoiceNumber}\nAmount: ${formattedAmount}\nReceipt: ${receiptNumber}\n\nThank you for your payment!`;

  return await sendSMS(phoneNumber, message, provider);
};

