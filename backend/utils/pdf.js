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

      // Header
      doc.fontSize(24).text('INVOICE', { align: 'center' });
      doc.moveDown(0.5);

      // Organization info
      if (invoice.organizationId) {
        const org = invoice.organizationId;
        if (org.name) {
          doc.fontSize(16).text(org.name, { align: 'center' });
        }
        if (org.address) {
          doc.fontSize(10).text(org.address, { align: 'center' });
        }
        if (org.phone || org.email) {
          const contact = [org.phone, org.email].filter(Boolean).join(' | ');
          doc.fontSize(10).text(contact, { align: 'center' });
        }
      }
      doc.moveDown(1);

      // Invoice details
      doc.fontSize(12);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, { continued: true, align: 'right' });
      doc.moveDown(0.3);
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' });
      if (invoice.dueDate) {
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, { align: 'right' });
      }
      doc.moveDown(1);

      // Member info
      if (invoice.memberId) {
        const member = invoice.memberId;
        doc.fontSize(12).text('Bill To:', { underline: true });
        doc.fontSize(11);
        doc.text(`${member.firstName || ''} ${member.lastName || ''}`.trim());
        if (member.memberId) {
          doc.text(`Member ID: ${member.memberId}`);
        }
        if (member.phone) {
          doc.text(`Phone: ${member.phone}`);
        }
        if (member.email) {
          doc.text(`Email: ${member.email}`);
        }
        if (member.address) {
          const addr = member.address;
          const addressLines = [
            addr.street,
            [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')
          ].filter(Boolean);
          addressLines.forEach(line => doc.text(line));
        }
      }
      doc.moveDown(1);

      // Items table
      doc.fontSize(12).text('Items:', { underline: true });
      doc.moveDown(0.3);

      // Table header
      const tableTop = doc.y;
      doc.fontSize(10);
      doc.text('Description', 50, tableTop);
      doc.text('Qty', 300, tableTop);
      doc.text('Price', 350, tableTop);
      doc.text('Amount', 450, tableTop, { align: 'right' });
      
      // Draw line
      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(0.5);

      // Items
      invoice.items.forEach((item, index) => {
        const y = doc.y;
        doc.text(item.description || 'Item', 50, y, { width: 240 });
        doc.text((item.quantity || 1).toString(), 300, y);
        doc.text(`₹${(item.unitPrice || 0).toFixed(2)}`, 350, y);
        doc.text(`₹${(item.total || 0).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
        
        if (index < invoice.items.length - 1) {
          doc.moveDown(0.3);
        }
      });

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Totals
      const totalsY = doc.y;
      doc.fontSize(10);
      doc.text('Subtotal:', 400, totalsY, { align: 'right' });
      doc.text(`₹${(invoice.subtotal || 0).toFixed(2)}`, 450, totalsY, { align: 'right', width: 100 });
      
      if (invoice.discount && invoice.discount.amount > 0) {
        doc.moveDown(0.3);
        doc.text('Discount:', 400, doc.y, { align: 'right' });
        doc.text(`-₹${invoice.discount.amount.toFixed(2)}`, 450, doc.y, { align: 'right', width: 100 });
      }

      if (invoice.tax && invoice.tax.amount > 0) {
        doc.moveDown(0.3);
        doc.text(`Tax (${invoice.tax.rate || 0}%):`, 400, doc.y, { align: 'right' });
        doc.text(`₹${invoice.tax.amount.toFixed(2)}`, 450, doc.y, { align: 'right', width: 100 });
      }

      if (invoice.rounding && invoice.rounding !== 0) {
        doc.moveDown(0.3);
        doc.text('Rounding:', 400, doc.y, { align: 'right' });
        doc.text(`₹${invoice.rounding.toFixed(2)}`, 450, doc.y, { align: 'right', width: 100 });
      }

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Total
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Total:', 400, doc.y, { align: 'right' });
      doc.text(`₹${(invoice.total || 0).toFixed(2)}`, 450, doc.y, { align: 'right', width: 100 });
      doc.font('Helvetica').fontSize(10);

      // Payment status
      doc.moveDown(1);
      if (invoice.status === 'paid') {
        doc.fontSize(12).fillColor('green').text('✓ PAID', { align: 'right' });
        doc.fillColor('black');
      } else if (invoice.pending > 0) {
        doc.fontSize(12).fillColor('orange').text(`Pending: ₹${invoice.pending.toFixed(2)}`, { align: 'right' });
        doc.fillColor('black');
      }

      // Notes
      if (invoice.customerNotes) {
        doc.moveDown(1);
        doc.fontSize(10).text('Notes:', { underline: true });
        doc.text(invoice.customerNotes);
      }

      // Footer
      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;
      doc.fontSize(8).fillColor('gray');
      doc.text(
        `Generated on ${new Date().toLocaleString('en-IN')}`,
        50,
        pageHeight - 50,
        { align: 'center', width: pageWidth - 100 }
      );
      doc.fillColor('black');

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

