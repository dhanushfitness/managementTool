import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import Service from '../models/Service.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import Enquiry from '../models/Enquiry.js';
import FollowUp from '../models/FollowUp.js';
import Expense from '../models/Expense.js';
import MemberCallLog from '../models/MemberCallLog.js';

dotenv.config();

// ========== DEFAULT CREDENTIALS ==========
const DEMO_EMAIL = 'admin@gymmanager.com';
const DEMO_PASSWORD = 'Admin@123';

// ========== HELPER FUNCTIONS ==========

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ========== DATA GENERATORS ==========

const firstNames = {
  male: ['Rahul', 'Amit', 'Raj', 'Vikram', 'Arjun', 'Rohit', 'Sanjay', 'Ajay', 'Karan', 'Nikhil', 
         'Aditya', 'Varun', 'Akash', 'Kunal', 'Manish', 'Deepak', 'Ankit', 'Vishal', 'Pankaj', 'Sachin'],
  female: ['Priya', 'Anjali', 'Sneha', 'Pooja', 'Neha', 'Ritu', 'Kavita', 'Meera', 'Sonia', 'Divya',
           'Swati', 'Nisha', 'Preeti', 'Simran', 'Riya', 'Anita', 'Shreya', 'Tanvi', 'Aarti', 'Megha']
};

const lastNames = ['Kumar', 'Sharma', 'Patel', 'Singh', 'Verma', 'Gupta', 'Mehta', 'Desai', 'Joshi', 'Reddy',
                   'Nair', 'Shah', 'Agarwal', 'Chopra', 'Kapoor', 'Malhotra', 'Rao', 'Iyer', 'Pandey', 'Mishra'];

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad'];

const leadSources = ['walk-in', 'referral', 'online', 'social-media', 'other'];

const enquiryStages = ['opened', 'qualified', 'demo', 'negotiation', 'converted', 'lost', 'not-interested'];

const expenseCategories = ['rent', 'utilities', 'salaries', 'equipment', 'maintenance', 'marketing', 'supplies'];

// ========== MAIN SEEDING FUNCTION ==========

async function seedDatabase() {
  try {
    console.log('🌱 Starting comprehensive database seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym_management');
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Organization.deleteMany({});
    await Branch.deleteMany({});
    await User.deleteMany({});
    await Member.deleteMany({});
    await Plan.deleteMany({});
    await Service.deleteMany({});
    await Invoice.deleteMany({});
    await Payment.deleteMany({});
    await Attendance.deleteMany({});
    await Enquiry.deleteMany({});
    await FollowUp.deleteMany({});
    await Expense.deleteMany({});
    await MemberCallLog.deleteMany({});
    console.log('✅ Database cleared\n');

    // ========== 1. CREATE ORGANIZATION ==========
    console.log('📝 Creating organization...');
    const organization = await Organization.create({
      name: 'FitLife Gym & Wellness Center',
      email: DEMO_EMAIL,
      phone: '+919876543210',
      address: {
        street: '123 Fitness Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      },
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      taxSettings: {
        gstNumber: '27AABCU9603R1ZM',
        taxRate: 18,
        taxInclusive: false
      },
      invoiceSettings: {
        prefix: 'INV',
        nextNumber: 1001,
        footer: 'Thank you for choosing FitLife Gym!',
        terms: 'Payment due within 7 days'
      },
      branding: {
        primaryColor: '#10B981',
        secondaryColor: '#059669'
      },
      onboardingStatus: {
        isCompleted: true,
        completedSteps: ['org_created', 'branch_added', 'plan_created', 'members_imported', 'staff_added'],
        completedAt: addMonths(new Date(), -5)
      },
      subscription: {
        plan: 'premium',
        status: 'active',
        startDate: addMonths(new Date(), -5),
        expiresAt: addMonths(new Date(), 7)
      },
      balances: {
        sms: {
          transactional: 1000,
          promotional: 500
        },
        mail: {
          free: 5000,
          paid: 2000
        }
      }
    });
    console.log(`✅ Organization created: ${organization.name}\n`);

    // ========== 2. CREATE BRANCH ==========
    console.log('📍 Creating branch...');
    const branch = await Branch.create({
      organizationId: organization._id,
      name: 'Main Branch - Andheri',
      code: 'MAIN01',
      // Required fields
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      locality: 'Andheri West',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      businessType: 'Gym & Fitness Center',
      brandName: 'FitLife Gym',
      countryCode: '+91',
      // Optional fields
      address: {
        street: '123 Fitness Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India',
        fullAddress: '123 Fitness Avenue, Andheri West, Mumbai, Maharashtra 400001'
      },
      phone: '+919876543210',
      email: DEMO_EMAIL,
      latitude: 19.1334,
      longitude: 72.8266,
      area: 5000,
      agreedToTerms: true,
      operatingHours: {
        monday: { open: '06:00', close: '22:00', isClosed: false },
        tuesday: { open: '06:00', close: '22:00', isClosed: false },
        wednesday: { open: '06:00', close: '22:00', isClosed: false },
        thursday: { open: '06:00', close: '22:00', isClosed: false },
        friday: { open: '06:00', close: '22:00', isClosed: false },
        saturday: { open: '07:00', close: '20:00', isClosed: false },
        sunday: { open: '08:00', close: '18:00', isClosed: false }
      }
    });
    console.log(`✅ Branch created: ${branch.name}\n`);

    // ========== 3. CREATE ADMIN USER ==========
    console.log('👤 Creating admin user...');
    const adminUser = await User.create({
      organizationId: organization._id,
      branchId: branch._id,
      email: DEMO_EMAIL,
      phone: '+919876543210',
      password: DEMO_PASSWORD,
      firstName: 'Admin',
      lastName: 'User',
      role: 'owner',
      gender: 'male',
      dateOfBirth: new Date('1985-05-15'),
      dateOfJoining: addMonths(new Date(), -5),
      jobDesignation: 'Owner & Manager',
      employeeType: 'full-time',
      category: 'manager',
      employmentStatus: 'active',
      isEmailVerified: true,
      isPhoneVerified: true,
      loginAccess: true
    });
    
    organization.createdBy = adminUser._id;
    await organization.save();
    console.log(`✅ Admin user created: ${adminUser.email}\n`);

    // ========== 4. CREATE STAFF MEMBERS ==========
    console.log('👥 Creating staff members...');
    const staffMembers = [];
    
    // Create 3 trainers
    for (let i = 0; i < 3; i++) {
      const staff = await User.create({
        organizationId: organization._id,
        branchId: branch._id,
        email: `trainer${i + 1}@fitlife.com`,
        phone: `+9198765432${20 + i}`,
        password: DEMO_PASSWORD,
        firstName: randomElement(firstNames.male),
        lastName: randomElement(lastNames),
        role: 'staff',
        gender: 'male',
        dateOfBirth: randomDate(new Date('1990-01-01'), new Date('1998-12-31')),
        dateOfJoining: randomDate(addMonths(new Date(), -5), addMonths(new Date(), -3)),
        jobDesignation: 'Fitness Trainer',
        employeeType: 'full-time',
        category: 'trainer',
        payoutType: 'fixed',
        salary: randomNumber(25000, 40000),
        employmentStatus: 'active',
        isEmailVerified: true,
        loginAccess: true
      });
      staffMembers.push(staff);
      console.log(`  ✅ Trainer: ${staff.firstName} ${staff.lastName}`);
    }

    // Create 2 receptionists
    for (let i = 0; i < 2; i++) {
      const staff = await User.create({
        organizationId: organization._id,
        branchId: branch._id,
        email: `reception${i + 1}@fitlife.com`,
        phone: `+9198765432${30 + i}`,
        password: DEMO_PASSWORD,
        firstName: randomElement(firstNames.female),
        lastName: randomElement(lastNames),
        role: 'staff',
        gender: 'female',
        dateOfBirth: randomDate(new Date('1995-01-01'), new Date('2000-12-31')),
        dateOfJoining: randomDate(addMonths(new Date(), -4), addMonths(new Date(), -2)),
        jobDesignation: 'Receptionist',
        employeeType: 'full-time',
        category: 'receptionist',
        payoutType: 'fixed',
        salary: randomNumber(18000, 25000),
        employmentStatus: 'active',
        isEmailVerified: true,
        loginAccess: true
      });
      staffMembers.push(staff);
      console.log(`  ✅ Receptionist: ${staff.firstName} ${staff.lastName}`);
    }
    console.log('');

    // ========== 5. CREATE MEMBERSHIP PLANS ==========
    console.log('💳 Creating membership plans...');
    const plansData = [
      {
        name: 'Monthly Basic',
        description: 'Full gym access for 1 month',
        type: 'duration',
        duration: { value: 1, unit: 'months' },
        price: 2000,
        setupFee: 500,
        taxRate: 18,
        isActive: true,
        isPopular: false,
        displayOrder: 1
      },
      {
        name: 'Quarterly Premium',
        description: 'Full gym access + trainer support for 3 months',
        type: 'duration',
        duration: { value: 3, unit: 'months' },
        price: 5500,
        setupFee: 0,
        taxRate: 18,
        isActive: true,
        isPopular: true,
        displayOrder: 2
      },
      {
        name: 'Half Yearly Elite',
        description: 'Full gym access + personal training for 6 months',
        type: 'duration',
        duration: { value: 6, unit: 'months' },
        price: 10000,
        setupFee: 0,
        taxRate: 18,
        isActive: true,
        isPopular: true,
        displayOrder: 3
      },
      {
        name: 'Annual Platinum',
        description: 'Complete access with all amenities for 1 year',
        type: 'duration',
        duration: { value: 1, unit: 'years' },
        price: 18000,
        setupFee: 0,
        taxRate: 18,
        isActive: true,
        isPopular: false,
        displayOrder: 4
      },
      {
        name: 'Session Pack - 10',
        description: '10 personal training sessions',
        type: 'sessions',
        sessions: 10,
        price: 3000,
        setupFee: 0,
        taxRate: 18,
        isActive: true,
        isPopular: false,
        displayOrder: 5
      },
      {
        name: 'Session Pack - 20',
        description: '20 personal training sessions',
        type: 'sessions',
        sessions: 20,
        price: 5500,
        setupFee: 0,
        taxRate: 18,
        isActive: true,
        isPopular: false,
        displayOrder: 6
      }
    ];

    const plans = [];
    for (const planData of plansData) {
      const plan = await Plan.create({
        ...planData,
        organizationId: organization._id,
        createdBy: adminUser._id
      });
      plans.push(plan);
      console.log(`  ✅ ${plan.name} - ₹${plan.price}`);
    }
    console.log('');

    // ========== 6. CREATE SERVICES ==========
    console.log('🏋️ Creating services...');
    const servicesData = [
      { name: 'Gym Membership', category: 'membership', icon: 'dumbbell', accentColor: '#F97316' },
      { name: 'Personal Training', category: 'training', icon: 'user', accentColor: '#8B5CF6' },
      { name: 'Yoga Classes', category: 'classes', icon: 'heart', accentColor: '#EC4899' },
      { name: 'Zumba Classes', category: 'classes', icon: 'music', accentColor: '#F59E0B' },
      { name: 'Nutrition Counseling', category: 'wellness', icon: 'apple', accentColor: '#10B981' },
      { name: 'Physiotherapy', category: 'wellness', icon: 'activity', accentColor: '#3B82F6' }
    ];

    for (let i = 0; i < servicesData.length; i++) {
      const serviceData = servicesData[i];
      await Service.create({
        ...serviceData,
        organizationId: organization._id,
        slug: serviceData.name.toLowerCase().replace(/ /g, '-'),
        description: `Professional ${serviceData.name} services`,
        isPromoted: i < 3,
        isActive: true,
        displayOrder: i + 1,
        createdBy: adminUser._id
      });
      console.log(`  ✅ ${serviceData.name}`);
    }
    console.log('');

    // ========== 7. CREATE ENQUIRIES (Last 5 months) ==========
    console.log('📞 Creating enquiries...');
    const enquiries = [];
    const startDate = addMonths(new Date(), -5);
    const endDate = new Date();
    
    for (let i = 0; i < 80; i++) {
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const firstName = randomElement(firstNames[gender]);
      const lastName = randomElement(lastNames);
      const enquiryDate = randomDate(startDate, endDate);
      const stage = randomElement(enquiryStages);
      const leadSource = randomElement(leadSources);
      
      const enquiry = await Enquiry.create({
        organizationId: organization._id,
        branchId: branch._id,
        enquiryId: `ENQ${String(i + 1).padStart(6, '0')}`,
        name: `${firstName} ${lastName}`,
        phone: `+919${String(randomNumber(100000000, 999999999))}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        date: enquiryDate,
        service: randomElement(plans)._id,
        serviceName: randomElement(plans).name,
        leadSource,
        enquiryStage: stage,
        enquiryType: 'new',
        customerType: 'individual',
        gender,
        fitnessGoal: randomElement(['weight-loss', 'muscle-gain', 'fitness', 'strength', 'general-health']),
        assignedStaff: randomElement([adminUser, ...staffMembers])._id,
        callTag: randomElement(['hot', 'warm', 'cold']),
        expectedAmount: randomElement([2000, 5500, 10000, 18000]),
        expectedClosureDate: addDays(enquiryDate, randomNumber(7, 30)),
        notes: `Interested in ${randomElement(['weight loss', 'muscle building', 'general fitness'])}`,
        createdBy: randomElement([adminUser, ...staffMembers])._id,
        createdAt: enquiryDate,
        updatedAt: enquiryDate
      });
      
      enquiries.push(enquiry);
    }
    console.log(`✅ Created ${enquiries.length} enquiries\n`);

    // ========== 8. CREATE MEMBERS (Last 5 months) ==========
    console.log('👥 Creating members...');
    const members = [];
    
    // Convert 40 enquiries to members
    const convertedEnquiries = enquiries.filter(e => e.enquiryStage === 'converted').slice(0, 40);
    
    for (let i = 0; i < 40; i++) {
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const firstName = randomElement(firstNames[gender]);
      const lastName = randomElement(lastNames);
      
      // Force first 10 members to have expired memberships for demo
      let joinDate, plan, membershipStatus, planStartDate, planEndDate;
      
      if (i < 10) {
        // Create expired members (joined 4-5 months ago with 1-month plans)
        joinDate = randomDate(addMonths(new Date(), -5), addMonths(new Date(), -4));
        plan = plans.find(p => p.name === 'Monthly Basic'); // 1 month plan
        planStartDate = joinDate;
        planEndDate = addMonths(planStartDate, 1);
        membershipStatus = 'expired';
      } else {
        // Create active or mixed status members
        joinDate = randomDate(startDate, endDate);
        plan = randomElement(plans.filter(p => p.type === 'duration'));
        planStartDate = joinDate;
        planEndDate = new Date(planStartDate);
        
        if (plan.duration.unit === 'months') {
          planEndDate = addMonths(planStartDate, plan.duration.value);
        } else if (plan.duration.unit === 'years') {
          planEndDate = addMonths(planStartDate, plan.duration.value * 12);
        }
        
        // Determine membership status
        membershipStatus = 'active';
        if (planEndDate < new Date()) {
          membershipStatus = Math.random() > 0.3 ? 'expired' : 'active'; // 30% stay active (renewed)
          if (membershipStatus === 'active') {
            // Extend end date for renewed memberships
            planEndDate = addMonths(new Date(), randomNumber(1, 6));
          }
        }
      }
      
      const member = await Member.create({
        organizationId: organization._id,
        branchId: branch._id,
        memberId: `MEM${String(i + 1).padStart(6, '0')}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        phone: `+919${String(randomNumber(100000000, 999999999))}`,
        dateOfBirth: randomDate(new Date('1980-01-01'), new Date('2005-12-31')),
        gender,
        address: {
          street: `${randomNumber(1, 999)} ${randomElement(['MG Road', 'Park Street', 'Main Road', 'Station Road'])}`,
          city: randomElement(cities),
          state: 'Maharashtra',
          zipCode: `4000${randomNumber(10, 99)}`,
          country: 'India'
        },
        emergencyContact: {
          name: `${randomElement(firstNames[gender === 'male' ? 'female' : 'male'])} ${lastName}`,
          phone: `+919${String(randomNumber(100000000, 999999999))}`,
          relationship: randomElement(['spouse', 'parent', 'sibling', 'friend'])
        },
        membershipStatus,
        currentPlan: {
          planId: plan._id,
          planName: plan.name,
          startDate: planStartDate,
          endDate: planEndDate
        },
        salesRep: randomElement([adminUser, ...staffMembers])._id,
        generalTrainer: randomElement(staffMembers.filter(s => s.category === 'trainer'))._id,
        fitnessProfile: {
          bodyWeight: randomNumber(50, 100),
          height: randomNumber(150, 190),
          bmi: randomNumber(18, 30),
          fatPercentage: randomNumber(15, 35),
          age: randomNumber(20, 50)
        },
        attendanceStats: {
          totalCheckIns: randomNumber(10, 100),
          lastCheckIn: randomDate(addDays(new Date(), -7), new Date()),
          currentStreak: randomNumber(0, 15),
          longestStreak: randomNumber(5, 30),
          averageVisitsPerWeek: randomNumber(2, 6)
        },
        source: randomElement(leadSources),
        createdBy: adminUser._id,
        createdAt: joinDate,
        updatedAt: joinDate
      });
      
      // Update enquiry if it was converted
      if (i < convertedEnquiries.length) {
        convertedEnquiries[i].convertedToMember = member._id;
        convertedEnquiries[i].convertedAt = joinDate;
        await convertedEnquiries[i].save();
      }
      
      members.push(member);
    }
    console.log(`✅ Created ${members.length} members\n`);

    // ========== 9. CREATE INVOICES & PAYMENTS ==========
    console.log('🧾 Creating invoices and payments...');
    let invoiceCount = 0;
    
    for (const member of members) {
      if (!member.currentPlan || !member.currentPlan.planId) continue;
      
      const plan = plans.find(p => p._id.toString() === member.currentPlan.planId.toString());
      if (!plan) continue;
      
      const invoiceNumber = `INV-${String(1001 + invoiceCount).padStart(6, '0')}`;
      const subtotal = plan.price + (plan.setupFee || 0);
      const taxAmount = (subtotal * plan.taxRate) / 100;
      const total = subtotal + taxAmount;
      
      const paymentMethod = randomElement(['razorpay', 'cash', 'upi', 'card']);
      
      // Use the member's plan start date for invoice date
      const invoiceDate = member.currentPlan.startDate;
      const paidDate = member.currentPlan.startDate;
      
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
          total,
          startDate: member.currentPlan.startDate,
          expiryDate: member.currentPlan.endDate  // 🔥 This is the key field!
        }],
        subtotal,
        tax: {
          rate: plan.taxRate,
          amount: taxAmount
        },
        total,
        status: 'paid',
        dueDate: addDays(invoiceDate, 7),
        paidDate: paidDate,
        paymentMethod,
        currency: organization.currency,
        createdBy: adminUser._id,
        createdAt: invoiceDate,
        updatedAt: invoiceDate
      });
      
      // Create payment
      const receiptNumber = `RCP${String(1001 + invoiceCount).padStart(6, '0')}`;
      await Payment.create({
        organizationId: organization._id,
        branchId: branch._id,
        invoiceId: invoice._id,
        memberId: member._id,
        amount: total,
        currency: organization.currency,
        status: 'completed',
        paymentMethod,
        receiptNumber,
        paidAt: paidDate,
        reconciled: true,
        reconciledAt: paidDate,
        createdBy: adminUser._id,
        createdAt: invoiceDate,
        updatedAt: invoiceDate
      });
      
      invoiceCount++;
    }
    console.log(`✅ Created ${invoiceCount} invoices and payments\n`);

    // ========== 10. CREATE ATTENDANCE RECORDS ==========
    console.log('📊 Creating attendance records...');
    let attendanceCount = 0;
    const activeMembers = members.filter(m => m.membershipStatus === 'active');
    
    for (const member of activeMembers) {
      const startDate = member.currentPlan.startDate;
      const endDate = new Date() < member.currentPlan.endDate ? new Date() : member.currentPlan.endDate;
      const daysBetween = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      // Create attendance for random days (50-70% attendance)
      const attendanceDays = Math.floor(daysBetween * (0.5 + Math.random() * 0.2));
      
      for (let i = 0; i < attendanceDays; i++) {
        const checkInDate = randomDate(startDate, endDate);
        const checkInTime = new Date(checkInDate);
        checkInTime.setHours(randomNumber(6, 20), randomNumber(0, 59), 0);
        
        await Attendance.create({
          organizationId: organization._id,
          branchId: branch._id,
          memberId: member._id,
          checkInTime,
          method: randomElement(['manual', 'biometric', 'qr']),
          status: 'success',
          checkedInBy: randomElement([adminUser, ...staffMembers])._id,
          createdAt: checkInTime,
          updatedAt: checkInTime
        });
        
        attendanceCount++;
      }
    }
    console.log(`✅ Created ${attendanceCount} attendance records\n`);

    // ========== 11. CREATE FOLLOW-UPS ==========
    console.log('📅 Creating follow-ups...');
    let followUpCount = 0;
    
    // Follow-ups for enquiries
    for (const enquiry of enquiries.slice(0, 30)) {
      const followUpDate = addDays(enquiry.date, randomNumber(1, 14));
      
      await FollowUp.create({
        organizationId: organization._id,
        branchId: branch._id,
        type: 'follow-up',
        callType: 'enquiry-call',
        callStatus: randomElement(['scheduled', 'contacted', 'not-contacted']),
        scheduledTime: followUpDate,
        title: `Follow up with ${enquiry.name}`,
        description: `Call to discuss membership plans`,
        relatedTo: {
          entityType: 'enquiry',
          entityId: enquiry._id
        },
        dueDate: followUpDate,
        status: followUpDate < new Date() ? randomElement(['completed', 'cancelled']) : 'pending',
        priority: randomElement(['low', 'medium', 'high']),
        assignedTo: enquiry.assignedStaff,
        createdBy: adminUser._id,
        createdAt: enquiry.date,
        updatedAt: enquiry.date
      });
      
      followUpCount++;
    }
    
    // Follow-ups for members (renewal reminders)
    const expiringMembers = members.filter(m => {
      const daysToExpiry = Math.floor((m.currentPlan.endDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysToExpiry > 0 && daysToExpiry < 30;
    });
    
    for (const member of expiringMembers) {
      const followUpDate = addDays(member.currentPlan.endDate, -7);
      
      await FollowUp.create({
        organizationId: organization._id,
        branchId: branch._id,
        type: 'follow-up',
        callType: 'renewal-call',
        callStatus: 'scheduled',
        scheduledTime: followUpDate,
        title: `Renewal reminder - ${member.firstName} ${member.lastName}`,
        description: `Membership expires on ${member.currentPlan.endDate.toDateString()}`,
        relatedTo: {
          entityType: 'member',
          entityId: member._id
        },
        dueDate: followUpDate,
        status: 'pending',
        priority: 'high',
        assignedTo: member.salesRep,
        createdBy: adminUser._id
      });
      
      followUpCount++;
    }
    console.log(`✅ Created ${followUpCount} follow-ups\n`);

    // ========== 12. CREATE EXPENSES ==========
    console.log('💰 Creating expenses...');
    const expensesData = [
      { category: 'rent', paidTo: 'Property Owner', paidTowards: 'Monthly Rent', amount: 50000 },
      { category: 'utilities', paidTo: 'Electricity Board', paidTowards: 'Electricity Bill', amount: 8000 },
      { category: 'utilities', paidTo: 'Water Department', paidTowards: 'Water Bill', amount: 2000 },
      { category: 'salaries', paidTo: 'Staff Salary', paidTowards: 'Monthly Salaries', amount: 150000 },
      { category: 'equipment', paidTo: 'Gym Equipment Co.', paidTowards: 'Equipment Purchase', amount: 75000 },
      { category: 'maintenance', paidTo: 'AC Services', paidTowards: 'AC Maintenance', amount: 5000 },
      { category: 'marketing', paidTo: 'Social Media Ads', paidTowards: 'Facebook Ads', amount: 10000 },
      { category: 'supplies', paidTo: 'Cleaning Supplies', paidTowards: 'Cleaning Materials', amount: 3000 }
    ];
    
    let expenseCount = 0;
    for (let month = 0; month < 5; month++) {
      const monthDate = addMonths(new Date(), -month);
      
      for (const expenseData of expensesData) {
        // Not all expenses every month
        if (expenseData.category === 'equipment' && Math.random() > 0.3) continue;
        if (expenseData.category === 'marketing' && Math.random() > 0.5) continue;
        
        const voucherDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), randomNumber(1, 28));
        
        await Expense.create({
          organizationId: organization._id,
          branchId: branch._id,
          voucherDate,
          category: expenseData.category,
          paidTo: expenseData.paidTo,
          paidTowards: expenseData.paidTowards,
          amount: expenseData.amount + randomNumber(-2000, 2000),
          paymentSource: randomElement(['cash', 'bank-account', 'credit-card']),
          paymentMode: randomElement(['cash', 'card', 'upi', 'bank_transfer']),
          status: 'paid',
          approvedBy: adminUser._id,
          approvedAt: voucherDate,
          createdBy: adminUser._id,
          createdAt: voucherDate,
          updatedAt: voucherDate
        });
        
        expenseCount++;
      }
    }
    console.log(`✅ Created ${expenseCount} expenses\n`);

    // ========== SUMMARY ==========
    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 DEFAULT LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Email:    ${DEMO_EMAIL}`);
    console.log(`🔑 Password: ${DEMO_PASSWORD}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 DATABASE SUMMARY:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Organization: ${organization.name}`);
    console.log(`✅ Branch: ${branch.name}`);
    console.log(`✅ Admin Users: 1`);
    console.log(`✅ Staff Members: ${staffMembers.length}`);
    console.log(`✅ Membership Plans: ${plans.length}`);
    console.log(`✅ Services: ${servicesData.length}`);
    console.log(`✅ Enquiries: ${enquiries.length} (last 5 months)`);
    console.log(`✅ Members: ${members.length} (last 5 months)`);
    console.log(`✅ Invoices: ${invoiceCount}`);
    console.log(`✅ Payments: ${invoiceCount}`);
    console.log(`✅ Attendance Records: ${attendanceCount}`);
    console.log(`✅ Follow-ups: ${followUpCount}`);
    console.log(`✅ Expenses: ${expenseCount} (last 5 months)`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('🎯 DATA DISTRIBUTION:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Active Members: ${members.filter(m => m.membershipStatus === 'active').length}`);
    console.log(`Expired Members: ${members.filter(m => m.membershipStatus === 'expired').length}`);
    console.log(`Converted Enquiries: ${enquiries.filter(e => e.enquiryStage === 'converted').length}`);
    console.log(`Open Enquiries: ${enquiries.filter(e => ['opened', 'qualified', 'demo'].includes(e.enquiryStage)).length}`);
    console.log(`Lost Enquiries: ${enquiries.filter(e => e.enquiryStage === 'lost').length}`);
    console.log(`Total Revenue: ₹${invoiceCount * 8000} (approx)`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('✨ You can now login and explore the system with realistic data!');
    console.log('🚀 Run: npm start (in backend) and npm run dev (in frontend)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();

