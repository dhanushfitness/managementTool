import cron from 'node-cron';
import FollowUp from '../models/FollowUp.js';
import Organization from '../models/Organization.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/email.js';

/**
 * Mark missed follow-ups
 * Runs daily at 11 PM (23:00)
 * Finds follow-ups scheduled for today that were not contacted and marks them as missed
 */
export const markMissedFollowUps = async () => {
  try {
    console.log('[Cron Job] Starting missed follow-ups check...');
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Find all follow-ups scheduled for today that are still pending and not contacted
    const followUps = await FollowUp.find({
      $or: [
        { scheduledTime: { $gte: todayStart, $lte: todayEnd } },
        { dueDate: { $gte: todayStart, $lte: todayEnd } }
      ],
      status: 'pending',
      callStatus: { $in: ['scheduled', 'attempted'] },
      contactedAt: { $exists: false }
    }).populate('organizationId');

    let missedCount = 0;

    for (const followUp of followUps) {
      // Check if it was actually scheduled for today
      const scheduledDate = followUp.scheduledTime || followUp.dueDate;
      const scheduledDay = new Date(scheduledDate);
      scheduledDay.setHours(0, 0, 0, 0);
      
      if (scheduledDay.getTime() === todayStart.getTime()) {
        // Mark as missed
        followUp.callStatus = 'missed';
        followUp.status = 'cancelled';
        await followUp.save();
        missedCount++;
        
        console.log(`[Cron Job] Marked follow-up ${followUp._id} as missed`);
      }
    }

    console.log(`[Cron Job] Completed: ${missedCount} follow-ups marked as missed`);
  } catch (error) {
    console.error('[Cron Job] Error marking missed follow-ups:', error);
  }
};

/**
 * Send daily report to owner
 * Runs daily at 8 AM
 * Sends dashboard stats (sales, payments, new clients, etc.) to owner's email
 */
export const sendDailyReport = async () => {
  try {
    console.log('[Cron Job] Starting daily report generation...');
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Get all active organizations
    const organizations = await Organization.find({ isActive: true });
    
    let reportsSent = 0;

    for (const organization of organizations) {
      try {
        const organizationId = organization._id;
        
        // Get owner email
        let ownerEmail = organization.email;
        if (organization.createdBy) {
          const owner = await User.findById(organization.createdBy).select('email').lean();
          if (owner?.email) {
            ownerEmail = owner.email;
          }
        }
        
        if (!ownerEmail) {
          console.log(`[Cron Job] Skipping organization ${organization.name} - no owner email found`);
          continue;
        }
        
        // Calculate dashboard stats for today
        const [sales, paymentsCollected, dues, newClients, renewals, checkIns, activeMembers] = await Promise.all([
          // Sales (total invoice amount today)
          Invoice.aggregate([
            {
              $match: {
                organizationId,
                createdAt: { $gte: todayStart, $lte: todayEnd }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$total' },
                count: { $sum: 1 }
              }
            }
          ]),
          
          // Payments Collected (today)
          Payment.aggregate([
            {
              $match: {
                organizationId,
                status: 'completed',
                paidAt: { $gte: todayStart, $lte: todayEnd }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            }
          ]),
          
          // Dues (all pending invoices)
          Invoice.aggregate([
            {
              $match: {
                organizationId,
                status: { $in: ['sent', 'overdue', 'partial'] }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$pending' },
                count: { $sum: 1 }
              }
            }
          ]),
          
          // New Clients (today)
          Member.countDocuments({
            organizationId,
            createdAt: { $gte: todayStart, $lte: todayEnd }
          }),
          
          // Renewals (today)
          Member.countDocuments({
            organizationId,
            membershipStatus: 'active',
            'subscriptions.startDate': { $gte: todayStart, $lte: todayEnd }
          }),
          
          // Check-ins (today)
          Attendance.countDocuments({
            organizationId,
            status: 'success',
            checkInTime: { $gte: todayStart, $lte: todayEnd }
          }),
          
          // Active Members (total)
          Member.countDocuments({
            organizationId,
            membershipStatus: 'active',
            isActive: true
          })
        ]);
        
        const salesData = sales[0] || { total: 0, count: 0 };
        const paymentsData = paymentsCollected[0] || { total: 0, count: 0 };
        const duesData = dues[0] || { total: 0, count: 0 };
        
        // Format currency
        const formatCurrency = (amount) => {
          return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: organization.currency || 'INR',
            minimumFractionDigits: 2
          }).format(amount);
        };
        
        const reportDate = now.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Create email HTML
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
              .stat-card { background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #f97316; }
              .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
              .stat-value { font-size: 24px; font-weight: bold; color: #333; }
              .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; color: #f97316; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Daily Report - ${reportDate}</h2>
                <p>${organization.name}</p>
              </div>
              <div class="content">
                <h3 class="section-title">Today's Performance</h3>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-label">Sales</div>
                    <div class="stat-value">${formatCurrency(salesData.total)}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">${salesData.count} invoice(s)</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">Payments Collected</div>
                    <div class="stat-value">${formatCurrency(paymentsData.total)}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">${paymentsData.count} payment(s)</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">Pending Dues</div>
                    <div class="stat-value">${formatCurrency(duesData.total)}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">${duesData.count} invoice(s)</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">New Clients</div>
                    <div class="stat-value">${newClients}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">Renewals</div>
                    <div class="stat-value">${renewals}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">Check-ins</div>
                    <div class="stat-value">${checkIns}</div>
                  </div>
                </div>
                
                <h3 class="section-title">Overall Statistics</h3>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-label">Active Members</div>
                    <div class="stat-value">${activeMembers}</div>
                  </div>
                </div>
                
                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                  This is an automated daily report. For detailed analytics, please log in to your dashboard.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        // Send email
        const emailResult = await sendEmail({
          to: ownerEmail,
          subject: `Daily Report - ${reportDate} - ${organization.name}`,
          html: emailHtml
        });
        
        if (emailResult.success) {
          reportsSent++;
          console.log(`[Cron Job] Daily report sent to ${ownerEmail} for ${organization.name}`);
        } else {
          console.error(`[Cron Job] Failed to send daily report to ${ownerEmail}:`, emailResult.error);
        }
      } catch (error) {
        console.error(`[Cron Job] Error processing organization ${organization.name}:`, error);
      }
    }
    
    console.log(`[Cron Job] Completed: ${reportsSent} daily reports sent`);
  } catch (error) {
    console.error('[Cron Job] Error sending daily reports:', error);
  }
};

/**
 * Initialize all daily cron jobs
 * Note: Service expiry notifications are handled by membershipExpiry.js
 */
export const initializeDailyCronJobs = () => {
  // Mark missed follow-ups - runs daily at 11 PM (23:00)
  cron.schedule('0 23 * * *', async () => {
    await markMissedFollowUps();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  console.log('[Cron Jobs] Missed follow-ups check scheduled (daily at 11 PM)');

  // Send daily report to owner - runs daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    await sendDailyReport();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  console.log('[Cron Jobs] Daily report scheduled (daily at 8 AM)');
};

