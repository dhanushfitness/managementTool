import axios from 'axios';

// WhatsApp Business API integration
// Supports multiple providers: Facebook WhatsApp Business API, Twilio, 360dialog

/**
 * Send WhatsApp message using configured provider
 * @param {string} to - Phone number (with country code, e.g., +919876543210)
 * @param {string} message - Message content (for free-form messages)
 * @param {string} templateName - Template name (for template messages, optional)
 * @param {Array} parameters - Template parameters (optional)
 * @param {string} provider - Provider to use ('facebook', 'twilio', '360dialog', 'default')
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendWhatsAppMessage = async (to, message, templateName = null, parameters = [], provider = 'default') => {
  try {
    // Clean phone number
    let phoneNumber = to.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Ensure phone number has country code
    if (!phoneNumber.startsWith('+')) {
      // If it's a 10-digit Indian number, add +91
      if (phoneNumber.length === 10) {
        phoneNumber = '+91' + phoneNumber;
      } else {
        phoneNumber = '+' + phoneNumber;
      }
    }

    // Determine provider
    const activeProvider = provider === 'default' 
      ? (process.env.WHATSAPP_PROVIDER || 'facebook')
      : provider;

    switch (activeProvider) {
      case 'facebook':
        return await sendViaFacebook(phoneNumber, message, templateName, parameters);
      case 'twilio':
        return await sendViaTwilio(phoneNumber, message);
      case '360dialog':
        return await sendVia360Dialog(phoneNumber, message, templateName, parameters);
      default:
        return await sendViaDefault(phoneNumber, message);
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message'
    };
  }
};

/**
 * Send via Facebook WhatsApp Business API
 */
const sendViaFacebook = async (to, message, templateName, parameters) => {
  try {
    const apiKey = process.env.WHATSAPP_API_KEY;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiKey || !phoneNumberId) {
      console.warn('WhatsApp Facebook API not configured. Set WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID');
      return {
        success: false,
        error: 'WhatsApp Facebook API not configured'
      };
    }

    // If template is provided, use template message
    if (templateName) {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en'
            },
            components: parameters.length > 0 ? [{
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param
              }))
            }] : []
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } else {
      // Free-form text message (requires business verification)
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    }
  } catch (error) {
    console.error('Facebook WhatsApp API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Send via Twilio WhatsApp API
 */
const sendViaTwilio = async (to, message) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio WhatsApp not configured');
      return {
        success: false,
        error: 'Twilio WhatsApp not configured'
      };
    }

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        From: fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`,
        To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        Body: message
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );

    return {
      success: true,
      messageId: response.data.sid
    };
  } catch (error) {
    console.error('Twilio WhatsApp error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Send via 360dialog (Popular in India)
 */
const sendVia360Dialog = async (to, message, templateName, parameters) => {
  try {
    const apiKey = process.env.DIALOG360_API_KEY;
    const instanceId = process.env.DIALOG360_INSTANCE_ID;

    if (!apiKey || !instanceId) {
      console.warn('360dialog not configured');
      return {
        success: false,
        error: '360dialog not configured'
      };
    }

    // Remove + from phone number for 360dialog
    const cleanPhone = to.replace('+', '');

    if (templateName) {
      // Template message
      const response = await axios.post(
        `https://waba-api.360dialog.io/v1/messages`,
        {
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en'
            },
            components: parameters.length > 0 ? [{
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param
              }))
            }] : []
          }
        },
        {
          headers: {
            'D360-API-KEY': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } else {
      // Text message
      const response = await axios.post(
        `https://waba-api.360dialog.io/v1/messages`,
        {
          to: cleanPhone,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'D360-API-KEY': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    }
  } catch (error) {
    console.error('360dialog error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Default/Development mode (logs message, doesn't actually send)
 */
const sendViaDefault = async (to, message) => {
  console.log('📱 WhatsApp Message (Development Mode):');
  console.log(`   To: ${to}`);
  console.log(`   Message: ${message}`);
  console.log('   (No WhatsApp provider configured - message not sent)');
  
  return {
    success: true,
    messageId: `dev-${Date.now()}`,
    note: 'Development mode - message not actually sent'
  };
};

// ==================== Convenience Functions ====================

/**
 * Send invoice notification via WhatsApp
 */
export const sendInvoiceNotification = async (phoneNumber, memberName, invoiceNumber, amount, paymentLink = null) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);

  let message = `Hi ${memberName},\n\n📄 *Invoice ${invoiceNumber}* has been created.\n💰 Amount: *${formattedAmount}*\n\n`;
  
  if (paymentLink) {
    message += `💳 Pay now: ${paymentLink}\n\n`;
  }
  
  message += `Please check your email for the invoice PDF.\n\nThank you!`;

  return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send payment link via WhatsApp
 */
export const sendPaymentLink = async (phoneNumber, memberName, paymentLink, amount, invoiceNumber) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);

  const message = `Hi ${memberName},\n\n💳 *Payment Reminder*\n\nInvoice: ${invoiceNumber}\nAmount: *${formattedAmount}*\n\n💳 Pay now: ${paymentLink}\n\nThank you!`;

  return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send renewal/expiry reminder via WhatsApp
 */
export const sendRenewalReminder = async (phoneNumber, memberName, expiryDate, paymentLink = null, daysUntilExpiry = 0) => {
  const expiryDateStr = new Date(expiryDate).toLocaleDateString('en-IN');
  
  let message;
  if (daysUntilExpiry === 0) {
    message = `Hi ${memberName},\n\n⚠️ *Your membership has expired!*\n\nExpiry Date: ${expiryDateStr}\n\n`;
  } else {
    message = `Hi ${memberName},\n\n⏰ *Membership Expiry Reminder*\n\nYour membership expires in *${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}*\nExpiry Date: ${expiryDateStr}\n\n`;
  }
  
  if (paymentLink) {
    message += `🔄 Renew now: ${paymentLink}\n\n`;
  }
  
  message += `Contact us to renew and continue your fitness journey! 💪`;

  return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send welcome message via WhatsApp
 */
export const sendWelcomeMessage = async (phoneNumber, memberName, memberId) => {
  const message = `Welcome ${memberName}! 🎉\n\nYour membership has been activated.\nMember ID: ${memberId}\n\nWe're excited to have you join us! 💪\n\nIf you have any questions, feel free to contact us.`;

  return await sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send payment confirmation via WhatsApp
 */
export const sendPaymentConfirmation = async (phoneNumber, memberName, amount, invoiceNumber, receiptUrl = null) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);

  let message = `Hi ${memberName},\n\n✅ *Payment Confirmed!*\n\nInvoice: ${invoiceNumber}\nAmount: *${formattedAmount}*\n\nThank you for your payment! 🎉`;
  
  if (receiptUrl) {
    message += `\n\n📄 Receipt: ${receiptUrl}`;
  }

  return await sendWhatsAppMessage(phoneNumber, message);
};
