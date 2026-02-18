import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create reusable transporter
const createTransporter = () => {
  // Use SMTP settings from environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  return transporter;
};

/**
 * Send email with optional PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} options.text - Plain text email body (optional)
 * @param {Array} options.attachments - Array of attachment objects
 * @param {string} options.from - Sender email (optional)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendEmail = async ({ to, subject, html, text, attachments = [], from }) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP credentials not configured. Email sending disabled.');
      return {
        success: false,
        error: 'SMTP credentials not configured'
      };
    }

    const transporter = createTransporter();

    // For SendGrid, use the verified sender email as 'from'
    let fromEmail = from || process.env.SMTP_USER;
    
    // If using SendGrid (apikey), we need to set 'from' to a verified sender email
    // The SMTP_USER is 'apikey' for SendGrid, so we need a different 'from' address
    if (process.env.SMTP_USER === 'apikey' && process.env.SMTP_HOST === 'smtp.sendgrid.net') {
      // Use SMTP_FROM if set, otherwise try to get from organization or use a default
      fromEmail = from || process.env.SMTP_FROM || process.env.SMTP_USER;
    }

    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
};

/**
 * Send invoice email to member and gym owner
 * @param {Object} invoice - Invoice document
 * @param {Object} member - Member document
 * @param {Object} organization - Organization document
 * @param {Buffer} pdfBuffer - PDF buffer to attach
 * @returns {Promise<{memberEmail: {success: boolean}, ownerEmail: {success: boolean}}>}
 */
export const sendInvoiceEmail = async (invoice, member, organization, pdfBuffer) => {
  const results = {
    memberEmail: { success: false },
    ownerEmail: { success: false }
  };

  const invoiceNumber = invoice.invoiceNumber || invoice._id.toString().slice(-8);
  const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: invoice.currency || 'INR',
    minimumFractionDigits: 2
  }).format(invoice.total);

  const emailSubject = `Invoice ${invoiceNumber} - ${organization.name || 'Gym Management'}`;
  
  // Get sender email for SendGrid
  let senderEmail = process.env.SMTP_FROM;
  if (!senderEmail && organization.email) {
    senderEmail = organization.email;
  }
  if (!senderEmail && process.env.SMTP_USER && process.env.SMTP_USER !== 'apikey') {
    senderEmail = process.env.SMTP_USER;
  }
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .invoice-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Invoice ${invoiceNumber}</h2>
        </div>
        <div class="content">
          <p>Dear ${memberName},</p>
          <p>Thank you for your business! Please find your invoice attached.</p>
          
          <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(invoice.dateOfInvoice || invoice.createdAt).toLocaleDateString('en-IN')}</p>
            <p><strong>Total Amount:</strong> ${formattedTotal}</p>
            ${invoice.pending > 0 ? `<p><strong>Pending Amount:</strong> ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency || 'INR' }).format(invoice.pending)}</p>` : ''}
          </div>

          ${invoice.pending > 0 ? `
            <p>To make a payment, please use the payment link provided or contact us directly.</p>
          ` : `
            <p>This invoice has been fully paid. Thank you!</p>
          `}

          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <div class="footer">
            <p>Best regards,<br>${organization.name || 'Gym Management Team'}</p>
            ${organization.email ? `<p>Email: ${organization.email}</p>` : ''}
            ${organization.phone ? `<p>Phone: ${organization.phone}</p>` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send to member
  if (member.email) {
    results.memberEmail = await sendEmail({
      to: member.email,
      subject: emailSubject,
      html: emailHtml,
      from: senderEmail,
      attachments: [{
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
  }

  // Send to gym owner (organization email or owner email)
  let ownerEmail = organization.email;
  if (!ownerEmail && organization.ownerId) {
    try {
      const User = (await import('../models/User.js')).default;
      const owner = await User.findById(organization.ownerId).select('email').lean();
      ownerEmail = owner?.email;
    } catch (error) {
      console.error('Failed to fetch owner email:', error);
    }
  }
  
  if (ownerEmail) {
    const ownerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .invoice-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Invoice Created - ${invoiceNumber}</h2>
          </div>
          <div class="content">
            <p>A new invoice has been created for:</p>
            <div class="invoice-details">
              <p><strong>Member:</strong> ${memberName}</p>
              <p><strong>Member ID:</strong> ${member.memberId || 'N/A'}</p>
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Date:</strong> ${new Date(invoice.dateOfInvoice || invoice.createdAt).toLocaleDateString('en-IN')}</p>
              <p><strong>Total Amount:</strong> ${formattedTotal}</p>
              <p><strong>Status:</strong> ${invoice.status}</p>
            </div>
            <p>Please find the invoice PDF attached for your records.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    results.ownerEmail = await sendEmail({
      to: ownerEmail,
      subject: `New Invoice Created: ${invoiceNumber} - ${memberName}`,
      html: ownerEmailHtml,
      from: senderEmail,
      attachments: [{
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
  }

  return results;
};

/**
 * Send membership expiry notification
 * @param {Object} member - Member document
 * @param {Object} organization - Organization document
 * @param {Date} expiryDate - Membership expiry date
 * @param {number} daysUntilExpiry - Days until expiry
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendExpiryNotificationEmail = async (member, organization, expiryDate, daysUntilExpiry) => {
  const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
  const planName = member.currentPlan?.planName || 'Membership';
  
  const subject = daysUntilExpiry === 0 
    ? `Your ${planName} has Expired - ${organization.name || 'Gym Management'}`
    : `Your ${planName} Expires in ${daysUntilExpiry} Day${daysUntilExpiry > 1 ? 's' : ''}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${daysUntilExpiry === 0 ? '#dc2626' : '#f97316'}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .alert-box { background-color: ${daysUntilExpiry === 0 ? '#fee2e2' : '#fef3c7'}; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid ${daysUntilExpiry === 0 ? '#dc2626' : '#f97316'}; }
        .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${daysUntilExpiry === 0 ? 'Membership Expired' : 'Membership Expiry Reminder'}</h2>
        </div>
        <div class="content">
          <p>Dear ${memberName},</p>
          
          <div class="alert-box">
            <h3>${daysUntilExpiry === 0 ? '⚠️ Your membership has expired!' : `⏰ Your membership expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`}</h3>
            <p><strong>Plan:</strong> ${planName}</p>
            <p><strong>Expiry Date:</strong> ${new Date(expiryDate).toLocaleDateString('en-IN')}</p>
          </div>

          ${daysUntilExpiry === 0 ? `
            <p>Your membership has expired. To continue enjoying our services, please renew your membership.</p>
          ` : `
            <p>Your membership will expire soon. To avoid any interruption in service, please renew your membership before the expiry date.</p>
          `}

          <p>Contact us to renew your membership and continue your fitness journey with us!</p>
          
          <div style="text-align: center; margin-top: 20px;">
            ${organization.phone ? `<p>Call us: ${organization.phone}</p>` : ''}
            ${organization.email ? `<p>Email us: ${organization.email}</p>` : ''}
          </div>

          <p>Thank you for being a valued member!</p>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Best regards,<br>${organization.name || 'Gym Management Team'}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!member.email) {
    return { success: false, error: 'Member email not available' };
  }

  return await sendEmail({
    to: member.email,
    subject,
    html: emailHtml
  });
};

