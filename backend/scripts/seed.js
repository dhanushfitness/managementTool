import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';

dotenv.config();

const DEMO_EMAIL = 'demo@gym.com';
const DEMO_PASSWORD = 'demo123456';

// Demo data
const demoData = {
  organization: {
    name: 'FitLife Gym',
    email: DEMO_EMAIL,
    phone: '+1234567890',
    address: {
      street: '123 Fitness Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    },
    currency: 'INR',
    taxSettings: {
      gstNumber: '27AABCU9603R1ZM',
      taxRate: 18,
      taxInclusive: false
    },
    invoiceSettings: {
      prefix: 'INV',
      nextNumber: 1,
      footer: 'Thank you for your business!',
      terms: 'Payment due within 7 days'
    },
    onboardingStatus: {
      isCompleted: true,
      completedSteps: ['org_created', 'branch_added', 'plan_created', 'members_imported'],
      completedAt: new Date()
    }
  },
  branch: {
    name: 'Main Branch',
    code: 'MAIN',
    address: {
      street: '123 Fitness Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    },
    phone: '+1234567890',
    email: DEMO_EMAIL,
    operatingHours: {
      monday: { open: '06:00', close: '22:00', isClosed: false },
      tuesday: { open: '06:00', close: '22:00', isClosed: false },
      wednesday: { open: '06:00', close: '22:00', isClosed: false },
      thursday: { open: '06:00', close: '22:00', isClosed: false },
      friday: { open: '06:00', close: '22:00', isClosed: false },
      saturday: { open: '07:00', close: '20:00', isClosed: false },
      sunday: { open: '08:00', close: '18:00', isClosed: false }
    }
  },
  user: {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    phone: '+1234567890',
    firstName: 'Demo',
    lastName: 'Admin',
    role: 'owner'
  },
  plans: [
    {
      name: 'Monthly Plan',
      description: 'Full access for 1 month',
      type: 'duration',
      duration: { value: 1, unit: 'months' },
      price: 2000,
      setupFee: 0,
      taxRate: 18,
      isActive: true,
      isPopular: true,
      displayOrder: 1
    },
    {
      name: '3 Months Plan',
      description: 'Full access for 3 months',
      type: 'duration',
      duration: { value: 3, unit: 'months' },
      price: 5000,
      setupFee: 0,
      taxRate: 18,
      isActive: true,
      isPopular: true,
      displayOrder: 2
    },
    {
      name: '6 Months Plan',
      description: 'Full access for 6 months',
      type: 'duration',
      duration: { value: 6, unit: 'months' },
      price: 9000,
      setupFee: 0,
      taxRate: 18,
      isActive: true,
      isPopular: false,
      displayOrder: 3
    },
    {
      name: 'Annual Plan',
      description: 'Full access for 1 year',
      type: 'duration',
      duration: { value: 1, unit: 'years' },
      price: 15000,
      setupFee: 0,
      taxRate: 18,
      isActive: true,
      isPopular: false,
      displayOrder: 4
    },
    {
      name: 'Session Pack (10)',
      description: '10 sessions valid for 3 months',
      type: 'sessions',
      sessions: 10,
      price: 2500,
      setupFee: 0,
      taxRate: 18,
      isActive: true,
      isPopular: false,
      displayOrder: 5
    }
  ],
  members: [
    {
      firstName: 'Raj',
      lastName: 'Kumar',
      email: 'raj.kumar@example.com',
      phone: '+919876543210',
      gender: 'male',
      dateOfBirth: new Date('1990-05-15'),
      address: {
        street: '456 Main Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400002',
        country: 'India'
      },
      source: 'walk-in',
      membershipStatus: 'active'
    },
    {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@example.com',
      phone: '+919876543211',
      gender: 'female',
      dateOfBirth: new Date('1992-08-20'),
      address: {
        street: '789 Park Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400003',
        country: 'India'
      },
      source: 'online',
      membershipStatus: 'active'
    },
    {
      firstName: 'Amit',
      lastName: 'Patel',
      email: 'amit.patel@example.com',
      phone: '+919876543212',
      gender: 'male',
      dateOfBirth: new Date('1988-03-10'),
      address: {
        street: '321 Business District',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400004',
        country: 'India'
      },
      source: 'referral',
      membershipStatus: 'active'
    },
    {
      firstName: 'Sneha',
      lastName: 'Desai',
      email: 'sneha.desai@example.com',
      phone: '+919876543213',
      gender: 'female',
      dateOfBirth: new Date('1995-11-25'),
      address: {
        street: '654 Fitness Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400005',
        country: 'India'
      },
      source: 'walk-in',
      membershipStatus: 'expired'
    },
    {
      firstName: 'Vikram',
      lastName: 'Singh',
      email: 'vikram.singh@example.com',
      phone: '+919876543214',
      gender: 'male',
      dateOfBirth: new Date('1993-07-30'),
      address: {
        street: '987 Health Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400006',
        country: 'India'
      },
      source: 'online',
      membershipStatus: 'active'
    },
    {
      firstName: 'Anjali',
      lastName: 'Mehta',
      email: 'anjali.mehta@example.com',
      phone: '+919876543215',
      gender: 'female',
      dateOfBirth: new Date('1991-12-05'),
      address: {
        street: '147 Wellness Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400007',
        country: 'India'
      },
      source: 'referral',
      membershipStatus: 'frozen'
    }
  ]
};

async function generateMemberId(organizationId, index) {
  return `MEM${String(index + 1).padStart(6, '0')}`;
}

async function generateInvoiceNumber(organization, index) {
  const prefix = organization.invoiceSettings.prefix || 'INV';
  return `${prefix}-${String(index + 1).padStart(6, '0')}`;
}

async function generateReceiptNumber(organizationId, index) {
  return `RCP${String(index + 1).padStart(6, '0')}`;
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym_management');
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('🧹 Clearing existing demo data...');
    await Organization.deleteMany({ email: DEMO_EMAIL });
    await Member.deleteMany({});
    await Plan.deleteMany({});
    await Invoice.deleteMany({});
    await Payment.deleteMany({});
    await Attendance.deleteMany({});

    // Create Organization
    console.log('📝 Creating organization...');
    const organization = await Organization.create(demoData.organization);
    console.log(`✅ Organization created: ${organization.name}`);

    // Create Branch
    console.log('📍 Creating branch...');
    const branch = await Branch.create({
      ...demoData.branch,
      organizationId: organization._id
    });
    console.log(`✅ Branch created: ${branch.name}`);

    // Create User (Owner)
    console.log('👤 Creating user...');
    const hashedPassword = await bcrypt.hash(demoData.user.password, 10);
    const user = await User.create({
      ...demoData.user,
      organizationId: organization._id,
      branchId: branch._id,
      password: hashedPassword,
      isEmailVerified: true,
      isPhoneVerified: true
    });
    organization.createdBy = user._id;
    await organization.save();
    console.log(`✅ User created: ${user.email}`);

    // Create Plans
    console.log('💳 Creating membership plans...');
    const plans = [];
    for (const planData of demoData.plans) {
      const plan = await Plan.create({
        ...planData,
        organizationId: organization._id,
        createdBy: user._id
      });
      plans.push(plan);
      console.log(`  ✅ Plan created: ${plan.name}`);
    }

    // Create Members
    console.log('👥 Creating members...');
    const members = [];
    for (let i = 0; i < demoData.members.length; i++) {
      const memberData = demoData.members[i];
      const memberId = await generateMemberId(organization._id, i);
      
      const member = await Member.create({
        ...memberData,
        organizationId: organization._id,
        branchId: branch._id,
        memberId,
        createdBy: user._id,
        attendanceStats: {
          totalCheckIns: Math.floor(Math.random() * 50) + 10,
          lastCheckIn: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          currentStreak: Math.floor(Math.random() * 10),
          longestStreak: Math.floor(Math.random() * 20) + 5,
          averageVisitsPerWeek: Math.random() * 5 + 2
        }
      });

      // Assign active membership to active members
      if (memberData.membershipStatus === 'active') {
        const plan = plans[Math.floor(Math.random() * plans.length)];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
        let endDate = new Date(startDate);

        if (plan.type === 'duration') {
          const { value, unit } = plan.duration;
          switch (unit) {
            case 'days':
              endDate.setDate(endDate.getDate() + value);
              break;
            case 'weeks':
              endDate.setDate(endDate.getDate() + (value * 7));
              break;
            case 'months':
              endDate.setMonth(endDate.getMonth() + value);
              break;
            case 'years':
              endDate.setFullYear(endDate.getFullYear() + value);
              break;
          }
        }

        member.currentPlan = {
          planId: plan._id,
          planName: plan.name,
          startDate,
          endDate,
          sessions: plan.sessions ? {
            total: plan.sessions,
            used: Math.floor(Math.random() * plan.sessions),
            remaining: plan.sessions - Math.floor(Math.random() * plan.sessions)
          } : null
        };
        await member.save();
      } else if (memberData.membershipStatus === 'expired') {
        // Expired membership
        const plan = plans[0];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 2);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() - 1);

        member.currentPlan = {
          planId: plan._id,
          planName: plan.name,
          startDate,
          endDate
        };
        await member.save();
      }

      members.push(member);
      console.log(`  ✅ Member created: ${member.firstName} ${member.lastName} (${memberId})`);
    }

    // Create Invoices and Payments
    console.log('🧾 Creating invoices and payments...');
    for (let i = 0; i < members.length - 1; i++) { // Skip last member
      const member = members[i];
      if (member.membershipStatus !== 'active') continue;

      const plan = member.currentPlan?.planId ? 
        plans.find(p => p._id.toString() === member.currentPlan.planId.toString()) : 
        plans[0];

      const invoiceNumber = await generateInvoiceNumber(organization, i);
      const subtotal = plan.price;
      const taxAmount = (subtotal * plan.taxRate) / 100;
      const total = subtotal + taxAmount;

      const invoice = await Invoice.create({
        organizationId: organization._id,
        branchId: branch._id,
        invoiceNumber,
        memberId: member._id,
        planId: plan._id,
        type: 'membership',
        items: [{
          description: `Membership - ${plan.name}`,
          quantity: 1,
          unitPrice: plan.price,
          taxRate: plan.taxRate,
          amount: subtotal,
          taxAmount,
          total
        }],
        subtotal,
        tax: {
          rate: plan.taxRate,
          amount: taxAmount
        },
        total,
        status: 'paid',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        paidDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        paymentMethod: Math.random() > 0.5 ? 'razorpay' : 'cash',
        currency: organization.currency,
        createdBy: user._id
      });

      // Create payment
      const receiptNumber = await generateReceiptNumber(organization._id, i);
      await Payment.create({
        organizationId: organization._id,
        branchId: branch._id,
        invoiceId: invoice._id,
        memberId: member._id,
        amount: total,
        currency: organization.currency,
        status: 'completed',
        paymentMethod: invoice.paymentMethod,
        receiptNumber,
        paidAt: invoice.paidDate,
        reconciled: true,
        reconciledAt: invoice.paidDate,
        createdBy: user._id
      });

      console.log(`  ✅ Invoice created: ${invoiceNumber} for ${member.firstName} ${member.lastName}`);
    }

    // Create Attendance Records
    console.log('📊 Creating attendance records...');
    const today = new Date();
    for (let i = 0; i < members.length - 1; i++) {
      const member = members[i];
      if (member.membershipStatus !== 'active') continue;

      // Create attendance for last 7 days
      for (let day = 0; day < 7; day++) {
        const checkInDate = new Date(today);
        checkInDate.setDate(checkInDate.getDate() - day);
        
        // Random check-in (70% chance)
        if (Math.random() > 0.3) {
          const checkInTime = new Date(checkInDate);
          checkInTime.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

          await Attendance.create({
            organizationId: organization._id,
            branchId: branch._id,
            memberId: member._id,
            checkInTime,
            method: Math.random() > 0.7 ? 'biometric' : 'manual',
            status: 'success',
            checkedInBy: user._id
          });
        }
      }
    }
    console.log('  ✅ Attendance records created');

    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 DEMO LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Email: ${DEMO_EMAIL}`);
    console.log(`🔑 Password: ${DEMO_PASSWORD}`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 Summary:');
    console.log(`  ✅ Organization: ${organization.name}`);
    console.log(`  ✅ Branch: ${branch.name}`);
    console.log(`  ✅ Plans: ${plans.length}`);
    console.log(`  ✅ Members: ${members.length}`);
    console.log(`  ✅ Invoices: ${members.length - 1}`);
    console.log(`  ✅ Payments: ${members.length - 1}`);
    console.log(`  ✅ Attendance Records: ~${(members.length - 1) * 5} records\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

