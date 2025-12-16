import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import { billReportData } from './bill-report-data.js';
import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import Member from '../models/Member.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Plan from '../models/Plan.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to check if value is NaN
const isNaNValue = (value) => {
  return value === null || value === undefined || (typeof value === 'number' && isNaN(value));
};

// Helper function to parse date from DD-MM-YYYY format
const parseDate = (dateString) => {
  if (!dateString || isNaNValue(dateString)) return null;
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
};

// Helper function to parse name into first and last name
const parseName = (fullName) => {
  if (!fullName || isNaNValue(fullName)) return { firstName: 'Unknown', lastName: 'Member' };
  const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0) {
    return { firstName: 'Unknown', lastName: 'Member' };
  }
  if (parts.length === 1) {
    // If only one name part, use it as firstName and add a default lastName
    return { firstName: parts[0], lastName: 'Member' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

// Map payment mode from JSON to database enum
const mapPaymentMode = (payMode) => {
  if (!payMode || isNaNValue(payMode)) return 'cash';
  const mode = payMode.toLowerCase();
  if (mode.includes('online') || mode.includes('razorpay')) return 'razorpay';
  if (mode.includes('cash')) return 'cash';
  if (mode.includes('card')) return 'card';
  if (mode.includes('upi')) return 'upi';
  if (mode.includes('bank') || mode.includes('transfer')) return 'bank_transfer';
  return 'other';
};

// Map gender from JSON to database enum
const mapGender = (gender) => {
  if (!gender || isNaNValue(gender)) return 'other';
  const g = gender.toLowerCase();
  if (g === 'male' || g === 'm') return 'male';
  if (g === 'female' || g === 'f') return 'female';
  return 'other';
};

// Map lead source
const mapLeadSource = (source) => {
  if (!source || isNaNValue(source)) return 'walk-in';
  const s = source.toLowerCase();
  if (s.includes('referral')) return 'referral';
  if (s.includes('online') || s.includes('website')) return 'online';
  if (s.includes('social') || s.includes('facebook') || s.includes('instagram')) return 'social-media';
  return 'walk-in';
};

// Map membership status
const mapMembershipStatus = (status) => {
  if (!status || isNaNValue(status)) return 'active';
  const s = status.toLowerCase();
  if (s.includes('active')) return 'active';
  if (s.includes('inactive') || s.includes('expired')) return 'expired';
  if (s.includes('frozen')) return 'frozen';
  if (s.includes('cancelled')) return 'cancelled';
  return 'active';
};

// Find or create organization
async function findOrCreateOrganization(orgName = 'Imported Organization', orgEmail = 'imported@example.com') {
  let organization = await Organization.findOne({ email: orgEmail });
  
  if (!organization) {
    organization = await Organization.create({
      name: orgName,
      email: orgEmail,
      phone: '+919999999999',
      currency: 'INR',
      taxSettings: {
        taxRate: 0
      },
      invoiceSettings: {
        prefix: 'INV',
        nextNumber: 1
      }
    });
    console.log(`✅ Created organization: ${organization.name}`);
  } else {
    console.log(`✅ Found existing organization: ${organization.name}`);
  }
  
  return organization;
}

// Find or create branch
async function findOrCreateBranch(organizationId, branchLocation) {
  if (!branchLocation || isNaNValue(branchLocation)) {
    branchLocation = 'Main Branch';
  }
  
  // Create branch code from location name
  const branchCode = branchLocation.toUpperCase().replace(/\s+/g, '_').substring(0, 10);
  
  let branch = await Branch.findOne({ 
    organizationId, 
    code: branchCode 
  });
  
  if (!branch) {
    branch = await Branch.create({
      organizationId,
      name: branchLocation,
      code: branchCode,
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      locality: branchLocation,
      currency: 'INR',
      businessType: 'Gym',
      brandName: branchLocation,
      address: {
        street: branchLocation,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        fullAddress: branchLocation
      }
    });
    console.log(`✅ Created branch: ${branch.name}`);
  } else {
    console.log(`✅ Found existing branch: ${branch.name}`);
  }
  
  return branch;
}

// Find or create user
async function findOrCreateUser(organizationId, branchId, userName, role = 'staff') {
  if (!userName || isNaNValue(userName)) {
    // Create a default user if name is missing
    userName = 'System User';
  }
  
  const nameParts = parseName(userName);
  const email = `${nameParts.firstName.toLowerCase().replace(/\s+/g, '.')}.${nameParts.lastName.toLowerCase().replace(/\s+/g, '.')}@imported.com`;
  
  let user = await User.findOne({ 
    organizationId, 
    email 
  });
  
  if (!user) {
    // Generate a simple password hash (in production, use proper password)
    const hashedPassword = await bcrypt.hash('imported123', 10);
    
    user = await User.create({
      organizationId,
      branchId,
      email,
      phone: '+919999999999',
      password: hashedPassword,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      role: role
    });
    console.log(`✅ Created user: ${user.firstName} ${user.lastName}`);
  } else {
    console.log(`✅ Found existing user: ${user.firstName} ${user.lastName}`);
  }
  
  return user;
}

// Find or create member
async function findOrCreateMember(organizationId, branchId, memberData, salesRepId, createdById) {
  const memberIdStr = String(memberData.Member_ID || '');
  const memberId = `MEM${memberIdStr.padStart(6, '0')}`;
  
  // Check if member already exists
  let member = await Member.findOne({ 
    organizationId, 
    memberId 
  });
  
  if (member) {
    console.log(`✅ Found existing member: ${memberId} - ${member.firstName} ${member.lastName}`);
    return member;
  }
  
  const nameParts = parseName(memberData.Member_Name);
  const email = memberData['E-Mail'] && !isNaNValue(memberData['E-Mail']) 
    ? memberData['E-Mail'].toLowerCase().trim() 
    : `${nameParts.firstName.toLowerCase()}.${nameParts.lastName.toLowerCase()}@imported.com`;
  
  const phone = memberData.Contact_Number && !isNaNValue(memberData.Contact_Number)
    ? String(memberData.Contact_Number)
    : '9999999999';
  
  const dateOfBirth = parseDate(memberData.Birthday);
  const gender = mapGender(memberData.Gender);
  const gstNo = memberData.GST_No && !isNaNValue(memberData.GST_No) 
    ? String(memberData.GST_No) 
    : undefined;
  const clubId = memberData.Club_ID && !isNaNValue(memberData.Club_ID) 
    ? String(memberData.Club_ID) 
    : undefined;
  
  // Determine membership status based on Active/Inactive and dates
  let membershipStatus = mapMembershipStatus(memberData['Active/Inactive']);
  const startDate = parseDate(memberData.Start_Date);
  const endDate = parseDate(memberData.End_Date);
  
  // If end date is in the past, mark as expired
  if (endDate && endDate < new Date() && membershipStatus === 'active') {
    membershipStatus = 'expired';
  }
  
  member = await Member.create({
    organizationId,
    branchId,
    memberId,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email,
    phone,
    dateOfBirth,
    gender,
    gstNo,
    clubId,
    salesRep: salesRepId,
    source: mapLeadSource(memberData['Lead Source']),
    membershipStatus,
    currentPlan: (startDate && endDate) ? {
      startDate,
      endDate
    } : undefined,
    createdBy: createdById
  });
  
  console.log(`✅ Created member: ${memberId} - ${member.firstName} ${member.lastName}`);
  return member;
}

// Generate invoice number (use existing Bill_No or generate new)
async function getInvoiceNumber(organization, billNo) {
  if (billNo && !isNaNValue(billNo)) {
    // Check if invoice with this number already exists
    const existing = await Invoice.findOne({ invoiceNumber: billNo });
    if (!existing) {
      return billNo;
    }
  }
  
  // Generate new invoice number
  const prefix = organization.invoiceSettings?.prefix || 'INV';
  let number = organization.invoiceSettings?.nextNumber || 1;
  const invoiceNumber = `${prefix}-${String(number).padStart(6, '0')}`;
  
  // Update organization's next invoice number
  organization.invoiceSettings = organization.invoiceSettings || {};
  organization.invoiceSettings.nextNumber = number + 1;
  organization.invoiceSettings.prefix = prefix;
  await organization.save();
  
  return invoiceNumber;
}

// Create invoice
async function createInvoice(organizationId, branchId, memberId, invoiceData, createdById) {
  const billNo = invoiceData.Bill_No;
  const invoiceNumber = await getInvoiceNumber(
    await Organization.findById(organizationId),
    billNo
  );
  
  const purchaseDate = parseDate(invoiceData.Purchase_date) || new Date();
  const startDate = parseDate(invoiceData.Start_Date);
  const endDate = parseDate(invoiceData.End_Date);
  
  const amount = invoiceData.Amount || 0;
  const taxAmount = invoiceData.Tax_Amount || 0;
  const finalAmount = invoiceData.Final_Amount || amount + taxAmount;
  const paid = invoiceData.Paid || 0;
  const pending = invoiceData.Pending || (finalAmount - paid);
  
  // Determine invoice status
  let status = 'draft';
  if (paid >= finalAmount) {
    status = 'paid';
  } else if (paid > 0) {
    status = 'partial';
  }
  
  // Create invoice items
  const description = invoiceData.Description_Service && !isNaNValue(invoiceData.Description_Service)
    ? invoiceData.Description_Service
    : 'Gym Membership';
  
  const items = [{
    description,
    quantity: 1,
    unitPrice: amount,
    amount: amount,
    taxAmount: taxAmount,
    total: finalAmount,
    startDate: startDate,
    expiryDate: endDate
  }];
  
  // Payment modes
  const paymentModes = paid > 0 ? [{
    method: mapPaymentMode(invoiceData.Pay_Mode),
    amount: paid
  }] : [];
  
  const invoice = await Invoice.create({
    organizationId,
    branchId,
    invoiceNumber,
    memberId,
    type: 'membership',
    invoiceType: 'service',
    items,
    subtotal: amount,
    tax: {
      rate: amount > 0 ? (taxAmount / amount) * 100 : 0,
      amount: taxAmount
    },
    total: finalAmount,
    pending: pending,
    discountReason: invoiceData.Discount_Reason && !isNaNValue(invoiceData.Discount_Reason)
      ? invoiceData.Discount_Reason
      : undefined,
    customerNotes: invoiceData.Note && !isNaNValue(invoiceData.Note)
      ? invoiceData.Note
      : undefined,
    paymentModes,
    status,
    paidDate: paid >= finalAmount ? purchaseDate : undefined,
    paymentMethod: mapPaymentMode(invoiceData.Pay_Mode),
    currency: 'INR',
    createdBy: createdById,
    createdAt: purchaseDate,
    updatedAt: purchaseDate
  });
  
  console.log(`✅ Created invoice: ${invoiceNumber} - Amount: ${finalAmount}, Paid: ${paid}`);
  return invoice;
}

// Create payment
async function createPayment(organizationId, branchId, invoiceId, memberId, paymentData, createdById) {
  const paid = paymentData.Paid || 0;
  
  if (paid <= 0) {
    return null;
  }
  
  const purchaseDate = parseDate(paymentData.Purchase_date) || new Date();
  const paymentMethod = mapPaymentMode(paymentData.Pay_Mode);
  
  // Generate receipt number
  const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  const payment = await Payment.create({
    organizationId,
    branchId,
    invoiceId,
    memberId,
    amount: paid,
    currency: 'INR',
    status: 'completed',
    paymentMethod,
    receiptNumber,
    paidAt: purchaseDate,
    createdBy: createdById,
    createdAt: purchaseDate,
    updatedAt: purchaseDate
  });
  
  console.log(`✅ Created payment: ${receiptNumber} - Amount: ${paid}`);
  return payment;
}

// Default embedded data - Imported from bill-report-data.js
// To update the data, edit the file: backend/scripts/bill-report-data.js
const DEFAULT_DATA = billReportData;

// Read Excel file and convert to JSON format
function readExcelFile(filePath) {
  console.log(`📖 Reading Excel file: ${filePath}\n`);
  const workbook = XLSX.readFile(filePath);
  
  // Get the first sheet name (usually "Sheet1")
  const sheetName = workbook.SheetNames[0];
  console.log(`📄 Reading sheet: ${sheetName}`);
  
  // Convert sheet to JSON with header row
  // defval: '' ensures empty cells are converted to empty strings instead of undefined
  const worksheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json(worksheet, {
    defval: '', // Default value for empty cells
    raw: false  // Convert dates and numbers to strings for consistent handling
  });
  
  console.log(`📊 Found ${records.length} rows in Excel file`);
  if (records.length > 0) {
    console.log(`📋 Sample columns: ${Object.keys(records[0]).join(', ')}\n`);
  }
  
  return records;
}

// Read JSON file
function readJsonFile(filePath) {
  console.log(`📖 Reading JSON file: ${filePath}\n`);
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return jsonData.Sheet1 || [];
}

// Main import function
async function importBillReport(filePath, organizationName, organizationEmail) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    let records = [];
    
    // If filePath is provided, read from file
    if (filePath && filePath !== 'embedded') {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Determine file type and read accordingly
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        records = readExcelFile(filePath);
      } else if (fileExtension === '.json') {
        records = readJsonFile(filePath);
      } else {
        throw new Error(`Unsupported file format: ${fileExtension}. Please use .xlsx, .xls, or .json`);
      }
    } else {
      // Use embedded data
      console.log('📖 Using embedded data from script\n');
      records = DEFAULT_DATA.Sheet1 || [];
      
      if (records.length === 0) {
        console.log('⚠️  No data found in DEFAULT_DATA. Please add your data to the DEFAULT_DATA constant in the script.\n');
      }
    }
    
    if (!records || records.length === 0) {
      throw new Error('No records found. Please provide data either in DEFAULT_DATA or via file path.');
    }
    
    console.log(`📊 Found ${records.length} records to import\n`);

    // Find or create organization
    const organization = await findOrCreateOrganization(organizationName, organizationEmail);
    console.log('');

    // Process records
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        console.log(`\n[${i + 1}/${records.length}] Processing record...`);
        
        // Find or create branch
        const branch = await findOrCreateBranch(organization._id, record.Branch_Location);
        
        // Find or create users
        const salesRep = await findOrCreateUser(
          organization._id, 
          branch._id, 
          record.Sales_Rep_Name, 
          'staff'
        );
        const createdBy = await findOrCreateUser(
          organization._id, 
          branch._id, 
          record.Created_By, 
          'staff'
        );
        
        // Find or create member
        const member = await findOrCreateMember(
          organization._id,
          branch._id,
          record,
          salesRep._id,
          createdBy._id
        );
        
        // Create invoice
        const invoice = await createInvoice(
          organization._id,
          branch._id,
          member._id,
          record,
          createdBy._id
        );
        
        // Create payment if paid > 0
        if (record.Paid && record.Paid > 0) {
          await createPayment(
            organization._id,
            branch._id,
            invoice._id,
            member._id,
            record,
            createdBy._id
          );
        }
        
        successCount++;
        console.log(`✅ Successfully imported record ${i + 1}`);
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Error processing record ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        console.error(error.stack);
      }
    }

    // Calculate totals for summary - get all invoices and payments for this organization
    const totalSalesResult = await Invoice.aggregate([
      {
        $match: {
          organizationId: organization._id
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalCollectedResult = await Payment.aggregate([
      {
        $match: {
          organizationId: organization._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalSales = totalSalesResult[0]?.total || 0;
    const totalCollected = totalCollectedResult[0]?.total || 0;
    const invoiceCount = totalSalesResult[0]?.count || 0;
    const paymentCount = totalCollectedResult[0]?.count || 0;

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    console.log(`\n💰 SALES SUMMARY:`);
    console.log(`   Total Invoices: ${invoiceCount}`);
    console.log(`   Total Sales Amount: ₹${totalSales.toLocaleString('en-IN')}`);
    console.log(`   Total Payments: ${paymentCount}`);
    console.log(`   Total Amount Collected: ₹${totalCollected.toLocaleString('en-IN')}`);
    console.log(`\n📅 IMPORTANT: To view this data in the dashboard:`);
    console.log(`   The dashboard filters by date range. Your data has dates from the import.`);
    console.log(`   To see all sales:`);
    console.log(`   1. Select "Custom Range" in the date filter`);
    console.log(`   2. Set a wide date range (e.g., 2024-01-01 to 2026-12-31)`);
    console.log(`   3. Or check individual invoices/payments in their respective pages`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ Import completed!');
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the import
// Usage: 
//   node import-bill-report.js                    -> Uses embedded DEFAULT_DATA
//   node import-bill-report.js "file.xlsx"        -> Reads from file
//   node import-bill-report.js embedded           -> Uses embedded DEFAULT_DATA
const filePath = process.argv[2] || 'embedded'; // Default to embedded data
const organizationEmail = process.argv[3] || 'dhanush@gmail.com';
const organizationName = process.argv[4] || 'Dhanush Organization';

console.log('🚀 Starting Bill Report Import...\n');
if (filePath === 'embedded') {
  console.log(`📁 Data Source: Embedded (DEFAULT_DATA in script)`);
} else {
  console.log(`📁 File: ${filePath}`);
}
console.log(`📧 Organization Email: ${organizationEmail}`);
console.log(`🏢 Organization Name: ${organizationName}\n`);

importBillReport(filePath, organizationName, organizationEmail)
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

