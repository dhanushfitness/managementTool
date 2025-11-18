import cron from 'node-cron';
import Member from '../models/Member.js';
import Organization from '../models/Organization.js';
import { sendExpiryNotificationEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';
import { sendRenewalReminder } from '../utils/whatsapp.js';

/**
 * Check and update expired memberships
 * Runs daily at midnight
 */
export const checkMembershipExpiry = async () => {
  try {
    console.log('[Cron Job] Starting membership expiry check...');
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // Find all active members with expiry dates
    const activeMembers = await Member.find({
      membershipStatus: 'active',
      'currentPlan.endDate': { $exists: true, $ne: null }
    }).populate('organizationId');

    let expiredCount = 0;
    let notifiedCount = 0;

    for (const member of activeMembers) {
      const endDate = new Date(member.currentPlan.endDate);
      endDate.setHours(0, 0, 0, 0);

      // Check if membership has expired
      if (endDate < now) {
        // Mark as expired
        member.membershipStatus = 'expired';
        await member.save();
        expiredCount++;

        console.log(`[Cron Job] Marked member ${member.memberId} (${member.firstName} ${member.lastName}) as expired`);

        // Send expiry notification
        await sendExpiryNotifications(member, member.organizationId, endDate, 0);
        notifiedCount++;
      } else {
        // Check if expiry is approaching (7 days, 3 days, 1 day before)
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry === 7 || daysUntilExpiry === 3 || daysUntilExpiry === 1) {
          // Check if we've already sent notification for this day
          const lastNotification = member.currentPlan?.lastExpiryNotification;
          const shouldNotify = !lastNotification || 
            new Date(lastNotification).toLocaleDateString() !== now.toLocaleDateString();

          if (shouldNotify) {
            await sendExpiryNotifications(member, member.organizationId, endDate, daysUntilExpiry);
            
            // Update last notification date
            if (!member.currentPlan) member.currentPlan = {};
            member.currentPlan.lastExpiryNotification = now;
            await member.save();
            
            notifiedCount++;
            console.log(`[Cron Job] Sent expiry reminder to ${member.memberId} (${daysUntilExpiry} days remaining)`);
          }
        }
      }
    }

    console.log(`[Cron Job] Completed: ${expiredCount} memberships expired, ${notifiedCount} notifications sent`);
  } catch (error) {
    console.error('[Cron Job] Error checking membership expiry:', error);
  }
};

/**
 * Send expiry notifications via email, SMS, and WhatsApp
 */
const sendExpiryNotifications = async (member, organization, expiryDate, daysUntilExpiry) => {
  const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
  const planName = member.currentPlan?.planName || 'Membership';
  const expiryDateStr = new Date(expiryDate).toLocaleDateString('en-IN');

  // Email notification
  if (member.email) {
    try {
      const emailResult = await sendExpiryNotificationEmail(member, organization, expiryDate, daysUntilExpiry);
      if (emailResult.success) {
        console.log(`[Cron Job] Expiry email sent to ${member.email}`);
      }
    } catch (error) {
      console.error(`[Cron Job] Failed to send expiry email to ${member.email}:`, error);
    }
  }

  // SMS notification
  if (member.phone) {
    try {
      const smsMessage = daysUntilExpiry === 0
        ? `Hi ${memberName}, your ${planName} has expired on ${expiryDateStr}. Please renew to continue. Contact us for renewal.`
        : `Hi ${memberName}, your ${planName} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''} (${expiryDateStr}). Please renew to avoid interruption.`;

      const smsResult = await sendSMS(member.phone, smsMessage, 'msg91');
      if (smsResult.success) {
        console.log(`[Cron Job] Expiry SMS sent to ${member.phone}`);
      }
    } catch (error) {
      console.error(`[Cron Job] Failed to send expiry SMS to ${member.phone}:`, error);
    }
  }

  // WhatsApp notification
  if (member.phone) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const paymentLink = `${frontendUrl}/members/${member._id}?renew=true`;

      const whatsappResult = await sendRenewalReminder(
        member.phone,
        memberName,
        expiryDate,
        paymentLink,
        daysUntilExpiry
      );
      
      if (whatsappResult.success) {
        console.log(`[Cron Job] Expiry WhatsApp sent to ${member.phone}`);
      } else {
        console.log(`[Cron Job] WhatsApp notification skipped: ${whatsappResult.error}`);
      }
    } catch (error) {
      // WhatsApp is optional, don't log as error
      console.log(`[Cron Job] WhatsApp notification skipped for ${member.phone}: ${error.message}`);
    }
  }
};

/**
 * Initialize cron jobs
 */
export const initializeCronJobs = () => {
  // Run membership expiry check daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    await checkMembershipExpiry();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // Adjust timezone as needed
  });

  console.log('[Cron Jobs] Membership expiry check scheduled (daily at midnight)');
};

