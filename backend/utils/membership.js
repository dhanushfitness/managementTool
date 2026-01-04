import Member from '../models/Member.js';
import Invoice from '../models/Invoice.js';

/**
 * Activate membership for a member based on a paid invoice
 * This should only be called after payment is confirmed
 */
export const activateMembershipFromInvoice = async (invoice) => {
  try {
    if (!invoice.memberId) {
      console.log('No memberId in invoice, skipping membership activation');
      return;
    }

    // Only activate if invoice is fully paid
    if (invoice.status !== 'paid') {
      console.log(`Invoice ${invoice._id} is not fully paid (status: ${invoice.status}), skipping membership activation`);
      return;
    }

    const member = await Member.findById(invoice.memberId);
    if (!member) {
      console.error(`Member not found for invoice ${invoice._id}`);
      return;
    }

    // Find the first item with date information or use the first item
    const invoiceItems = invoice.items || [];
    const targetItem = invoiceItems.find(item => item?.startDate || item?.expiryDate) || invoiceItems[0];

    if (targetItem) {
      const startDate = targetItem.startDate ? new Date(targetItem.startDate) : new Date();
      const endDate = targetItem.expiryDate ? new Date(targetItem.expiryDate) : undefined;
      
      // Normalize dates to start of day for comparison
      const startDateNormalized = new Date(startDate);
      startDateNormalized.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const sessions = targetItem.numberOfSessions ? {
        total: targetItem.numberOfSessions,
        used: 0,
        remaining: targetItem.numberOfSessions
      } : undefined;

      // Only activate if startDate has arrived or passed
      // For upgrade invoices with future start dates, wait until the date arrives
      if (startDateNormalized <= now) {
        await Member.findOneAndUpdate(
          { _id: invoice.memberId },
          {
            $set: {
              membershipStatus: 'active',
              currentPlan: {
                planId: invoice.planId || targetItem.serviceId || undefined,
                planName: targetItem.description || invoice.planName || 'Membership Plan',
                startDate,
                endDate,
                sessions
              }
            }
          }
        );

        console.log(`Membership activated for member ${member.memberId} based on invoice ${invoice.invoiceNumber || invoice._id}`);
      } else {
        console.log(`Membership activation deferred for member ${member.memberId}. Start date ${startDateNormalized.toISOString()} is in the future. Will activate automatically when date arrives.`);
      }
    } else {
      // If no items with dates, just activate the membership
      await Member.findOneAndUpdate(
        { _id: invoice.memberId },
        { $set: { membershipStatus: 'active' } }
      );

      console.log(`Membership activated for member ${member.memberId} (no plan details)`);
    }
  } catch (error) {
    console.error('Failed to activate membership from invoice:', error);
    // Don't throw - this is a non-critical operation
  }
};

