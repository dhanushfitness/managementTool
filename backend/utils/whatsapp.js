import axios from 'axios';

// WhatsApp Business API integration
// This is a placeholder - you'll need to integrate with WhatsApp Business API via Twilio, 360dialog, or similar

export const sendWhatsAppMessage = async (to, templateName, parameters = [], organizationId = null) => {
  try {
    // Get WhatsApp settings from organization
    // In production, fetch from database
    
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
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
          'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.messages[0].id
    };
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

// Send payment link via WhatsApp
export const sendPaymentLink = async (phoneNumber, memberName, paymentLink, amount, invoiceNumber) => {
  const parameters = [memberName, invoiceNumber, `₹${amount}`, paymentLink];
  return await sendWhatsAppMessage(phoneNumber, 'payment_reminder', parameters);
};

// Send renewal reminder
export const sendRenewalReminder = async (phoneNumber, memberName, expiryDate, paymentLink) => {
  const parameters = [memberName, expiryDate, paymentLink];
  return await sendWhatsAppMessage(phoneNumber, 'renewal_reminder', parameters);
};

// Send welcome message
export const sendWelcomeMessage = async (phoneNumber, memberName, memberId) => {
  const parameters = [memberName, memberId];
  return await sendWhatsAppMessage(phoneNumber, 'welcome_message', parameters);
};

// Send payment confirmation
export const sendPaymentConfirmation = async (phoneNumber, memberName, amount, invoiceNumber, receiptUrl) => {
  const parameters = [memberName, invoiceNumber, `₹${amount}`, receiptUrl];
  return await sendWhatsAppMessage(phoneNumber, 'payment_confirmation', parameters);
};

