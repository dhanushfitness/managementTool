import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate invoice PDF as buffer
 * @param {Object} invoice - Invoice document (populated with memberId and organizationId)
 * @returns {Promise<Buffer>}
 */
export const generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Helper function to get organization address
      const getOrgAddress = (org) => {
        if (!org || !org.address) return '';
        if (typeof org.address === 'string') return org.address;
        const addr = org.address;
        const parts = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);
        return parts.join(', ');
      };

      // Red Header Section
      const headerHeight = 120;
      doc.rect(0, 0, doc.page.width, headerHeight)
        .fillColor('#DC2626')
        .fill();
      
      doc.fillColor('#FFFFFF');
      const org = invoice.organizationId;
      
      // Company logo area (placeholder)
      const logoX = 50;
      const logoY = 20;
      doc.rect(logoX, logoY, 60, 60)
        .fillColor('rgba(255, 255, 255, 0.2)')
        .fill();
      
      if (org?.name) {
        doc.fontSize(20).font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text(org.name, logoX + 70, logoY + 10);
      }
      
      if (getOrgAddress(org)) {
        doc.fontSize(9).font('Helvetica')
          .fillColor('rgba(255, 255, 255, 0.9)')
          .text(getOrgAddress(org), logoX + 70, logoY + 35, { width: 400 });
      }
      
      // Title
      doc.fontSize(28).font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text(
          invoice.isProForma ? 'Tax Invoice' : 'Tax Invoice',
          { align: 'center', y: logoY + 70 }
        );
      
      doc.fillColor('#000000');
      doc.moveDown(2);

      // Customer & Invoice Info (Two columns)
      const leftX = 50;
      const rightX = 300;
      const startY = doc.y;
      
      // Customer Details (Left)
      if (invoice.memberId) {
        const member = invoice.memberId;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Customer Name:', leftX, startY);
        doc.font('Helvetica');
        doc.text(`${(member.firstName || '').toUpperCase()} ${(member.lastName || '').toUpperCase()}`.trim(), leftX + 100, startY);
        
        let currentY = startY + 15;
        if (member.email) {
          doc.font('Helvetica-Bold').text('Email:', leftX, currentY);
          doc.font('Helvetica').text(member.email, leftX + 100, currentY);
          currentY += 15;
        }
        if (member.phone) {
          doc.font('Helvetica-Bold').text('Mobile:', leftX, currentY);
          doc.font('Helvetica').text(member.phone, leftX + 100, currentY);
          currentY += 15;
        }
        doc.font('Helvetica-Bold').text('Attendance ID:', leftX, currentY);
        doc.font('Helvetica').text(member.memberId || member.attendanceId || '-', leftX + 100, currentY);
        currentY += 15;
        
        const placeOfSupply = invoice.branchId?.address?.state || org?.address?.state || 'Karnataka';
        doc.font('Helvetica-Bold').text('Place of Supply:', leftX, currentY);
        doc.font('Helvetica').text(placeOfSupply, leftX + 100, currentY);
      }
      
      // Invoice Details (Right)
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Invoice Type:', rightX, startY);
      doc.font('Helvetica');
      const invoiceType = (invoice.type || 'New Booking').replace('-', ' ');
      doc.text(invoiceType.charAt(0).toUpperCase() + invoiceType.slice(1), rightX + 90, startY);
      
      let rightY = startY + 15;
      doc.font('Helvetica-Bold').text('Date, Time:', rightX, rightY);
      doc.font('Helvetica');
      const dateTime = new Date(invoice.createdAt).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      doc.text(dateTime, rightX + 90, rightY);
      rightY += 15;
      
      doc.font('Helvetica-Bold').text('Invoice Number:', rightX, rightY);
      doc.font('Helvetica').text(invoice.invoiceNumber || '-', rightX + 90, rightY);
      rightY += 15;
      
      doc.font('Helvetica-Bold').text('Date of Invoice:', rightX, rightY);
      doc.font('Helvetica');
      const invoiceDate = new Date(invoice.dateOfInvoice || invoice.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      doc.text(invoiceDate, rightX + 90, rightY);
      rightY += 15;
      
      if (invoice.createdBy) {
        doc.font('Helvetica-Bold').text('Created by:', rightX, rightY);
        doc.font('Helvetica');
        doc.text(`${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`, rightX + 90, rightY);
        rightY += 15;
      }
      
      if (invoice.memberId?.salesRep || invoice.createdBy) {
        doc.font('Helvetica-Bold').text('Sales Rep:', rightX, rightY);
        doc.font('Helvetica');
        const salesRep = invoice.memberId?.salesRep || invoice.createdBy;
        doc.text(`${salesRep.firstName} ${salesRep.lastName}`, rightX + 90, rightY);
      }
      
      doc.moveDown(2);

      // Items table
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      
      // Table header with background
      doc.rect(50, tableTop - 5, 500, 20)
        .fillColor('#F3F4F6')
        .fill();
      
      doc.fillColor('#000000');
      doc.text('DESCRIPTION', 50, tableTop);
      doc.text('DURATION', 150, tableTop);
      doc.text('QUANTITY', 350, tableTop, { align: 'center' });
      doc.text('SERVICE FEE', 450, tableTop, { align: 'right' });
      
      // Draw border
      doc.moveTo(50, tableTop - 5).lineTo(550, tableTop - 5).stroke();
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.moveTo(50, tableTop - 5).lineTo(50, tableTop + 15).stroke();
      doc.moveTo(550, tableTop - 5).lineTo(550, tableTop + 15).stroke();
      
      let itemY = tableTop + 25;
      doc.font('Helvetica').fontSize(9);

      // Items
      invoice.items.forEach((item, index) => {
        const itemAmount = item.amount || item.total || 0;
        const itemDiscount = item.discount?.amount || 0;
        const baseFee = item.total || (itemAmount - itemDiscount);
        
        // Description
        const description = item.description || item.serviceId?.name || 'Service';
        doc.text(description, 50, itemY, { width: 100 });
        
        // Dates if available
        if (item.startDate && item.expiryDate) {
          const startDate = new Date(item.startDate).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          });
          const expiryDate = new Date(item.expiryDate).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          });
          doc.fontSize(7).text(`Start date: ${startDate}, Expiry date: ${expiryDate}`, 50, itemY + 12, { width: 100 });
          doc.fontSize(9);
        }
        
        // Duration (simplified)
        doc.text('Valid for period', 150, itemY, { width: 190 });
        
        // Quantity
        doc.text((item.quantity || 1).toString(), 350, itemY, { align: 'center' });
        
        // Service Fee
        let feeY = itemY;
        if (itemDiscount > 0) {
          doc.fontSize(8).text(`Fee: ₹${itemAmount.toFixed(2)}`, 450, feeY, { align: 'right', width: 100 });
          feeY += 10;
          doc.fillColor('#DC2626').text(`Discount: ₹${itemDiscount.toFixed(2)}`, 450, feeY, { align: 'right', width: 100 });
          feeY += 10;
        }
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
        doc.text(`Base Fee: ₹${baseFee.toFixed(2)}`, 450, feeY, { align: 'right', width: 100 });
        doc.font('Helvetica');
        
        // Draw row border
        doc.moveTo(50, itemY + 30).lineTo(550, itemY + 30).stroke();
        
        itemY += 35;
      });

      doc.y = itemY + 10;

      // Summary Section
      const summaryX = 300;
      const summaryY = doc.y;
      doc.fontSize(10).font('Helvetica');
      
      doc.text('Subtotal', summaryX, summaryY);
      doc.text(`₹${(invoice.subtotal || 0).toFixed(2)}`, 450, summaryY, { align: 'right', width: 100 });
      
      if (invoice.tax && invoice.tax.amount > 0) {
        doc.text(`Tax (${invoice.tax.rate || 0}%)`, summaryX, summaryY + 15);
        doc.text(`₹${invoice.tax.amount.toFixed(2)}`, 450, summaryY + 15, { align: 'right', width: 100 });
      }

      doc.moveTo(summaryX, summaryY + 30).lineTo(550, summaryY + 30).stroke();
      
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total Due', summaryX, summaryY + 35);
      doc.text(`₹${(invoice.total || 0).toFixed(2)}`, 450, summaryY + 35, { align: 'right', width: 100 });
      
      doc.font('Helvetica').fontSize(10);
      const pending = invoice.pending || 0;
      doc.text('Pending', summaryX, summaryY + 55);
      doc.text(`₹${pending.toFixed(2)}`, 450, summaryY + 55, { align: 'right', width: 100 });
      
      doc.moveDown(2);

      // Terms & Conditions
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('TERMS AND CONDITIONS', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.fontSize(9).font('Helvetica');
      const termsY = doc.y;
      
      doc.font('Helvetica-Bold').text('Membership Privileges, Notices, Disclosure & Agreement', 50, termsY);
      doc.moveDown(0.5);
      
      doc.font('Helvetica-Bold').text('Upgradation/Renewal:', 50, doc.y);
      doc.font('Helvetica').text('Any change in membership program/upgradation has to be done within 15 days of joining', 50, doc.y + 12, { width: 500 });
      doc.moveDown(0.8);
      
      doc.font('Helvetica-Bold').text('Fresh Membership:', 50, doc.y);
      doc.font('Helvetica').text('A fresh membership can be taken on completion of earlier package.', 50, doc.y + 12, { width: 500 });
      doc.moveDown(0.8);
      
      doc.font('Helvetica-Bold').text('Transfer:', 50, doc.y);
      const orgName = org?.name || 'AIRFIT';
      doc.font('Helvetica').text(`Transfer of a membership is permitted to a non-member i.e. to a person who has not been a member with the same branch of ${orgName} before, at a transfer fee of Rs.3500+tax per transfer.`, 50, doc.y + 12, { width: 500 });
      doc.moveDown(0.8);
      
      doc.font('Helvetica-Bold').text('Cancellation/Refunds:', 50, doc.y);
      doc.font('Helvetica').text('No refunds shall be made for all the services.', 50, doc.y + 12, { width: 500 });
      doc.moveDown(1);
      
      doc.rect(50, doc.y, 500, 40)
        .fillColor('#F9FAFB')
        .fill();
      doc.font('Helvetica-Bold').fontSize(8).text('Membership Agreement Acknowledgment:', 55, doc.y + 5);
      doc.font('Helvetica').fontSize(7);
      doc.text('This membership agreement contains a waiver and release of liability and indemnity agreement in section "VI" on the document to which you will be bound. Do not sign this agreement before you read it. By signing the below, you acknowledge receipt of a fully completed copy of this membership agreement executed by you and the club and a copy of the rules and regulations printed overleaf, you agree to be bound by the terms and conditions contained herein.', 55, doc.y + 15, { width: 490 });
      
      doc.moveDown(1.5);

      // Footer
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      
      const footerY = doc.y;
      if (org?.email || org?.phone) {
        doc.fontSize(8).font('Helvetica');
        const contactInfo = [];
        if (org?.email) contactInfo.push(`Mail: ${org.email}`);
        if (org?.phone) contactInfo.push(`Phone: ${org.phone}`);
        doc.text(contactInfo.join(', '), { align: 'center' });
        doc.moveDown(0.3);
      }
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Thank You For Your Business!', { align: 'center' });
      doc.moveDown(0.3);
      
      doc.fontSize(7).font('Helvetica');
      doc.fillColor('gray');
      doc.text(
        'This is a computer generated invoice. No signature is required.',
        { align: 'center' }
      );
      doc.fillColor('black');
      
      // Customer Notes if available
      if (invoice.customerNotes) {
        doc.moveDown(1);
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Customer Notes:', 50, doc.y);
        doc.font('Helvetica').fontSize(8);
        doc.text(invoice.customerNotes, 50, doc.y + 12, { width: 500 });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

