import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';

dotenv.config();

const AIRFIT_EMAIL = 'airfitofficial24@gmail.com';
const AIRFIT_PASSWORD = 'Airfit@123';

const organizationSeedData = {
  name: 'airfit',
  email: AIRFIT_EMAIL,
  phone: '09916991626',
  address: {
    street: '2nd floor 1886 5th main 8th cross HAL 3rd Stage',
    city: 'banglore',
    state: 'Karnataka',
    zipCode: '560075',
    country: 'India'
  },
  logo: '/uploads/organizations/org-1762522433480-logo-red-color.png',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  taxSettings: {
    taxInclusive: true,
    taxRate: 0
  },
  invoiceSettings: {
    prefix: 'INV',
    nextNumber: 1
  },
  branding: {
    primaryColor: '#10B981'
  },
  razorpaySettings: {
    isConnected: false
  },
  whatsappSettings: {
    isConnected: false
  },
  onboardingStatus: {
    isCompleted: false,
    completedSteps: []
  },
  subscription: {
    plan: 'free',
    status: 'trial'
  },
  balances: {
    sms: {
      transactional: 0,
      promotional: 0
    },
    mail: {
      free: 5000,
      paid: 0
    }
  },
  isActive: true
};

const branchSeedData = {
  name: 'Main Branch',
  code: 'MAIN',
  brandName: 'airfit',
  businessType: 'fitness',
  locality: 'HAL 3rd Stage',
  city: 'banglore',
  state: 'Karnataka',
  country: 'India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  countryCode: '+91',
  phone: '09916991626',
  email: AIRFIT_EMAIL,
  address: {
    street: organizationSeedData.address.street,
    city: organizationSeedData.address.city,
    state: organizationSeedData.address.state,
    zipCode: organizationSeedData.address.zipCode,
    country: organizationSeedData.address.country,
    fullAddress: `${organizationSeedData.address.street}, ${organizationSeedData.address.city}, ${organizationSeedData.address.state} ${organizationSeedData.address.zipCode}, ${organizationSeedData.address.country}`
  }
};

const ownerSeedData = {
  email: AIRFIT_EMAIL,
  password: AIRFIT_PASSWORD,
  phone: '09916991626',
  firstName: 'Airfit',
  lastName: 'Owner',
  role: 'owner',
  isEmailVerified: true,
  isPhoneVerified: true
};

const planSeedData = [
  {
    name: 'Gold Membership',
    description: 'Unlimited gym access with group classes',
    type: 'duration',
    duration: { value: 3, unit: 'months' },
    price: 5999,
    setupFee: 0,
    taxRate: 0,
    features: [
      { name: 'Gym Access', included: true },
      { name: 'Group Classes', included: true },
      { name: 'Personal Trainer (2 sessions)', included: true }
    ],
    isActive: true,
    isPopular: true,
    displayOrder: 1
  },
  {
    name: 'Platinum Membership',
    description: 'Full access with personal training',
    type: 'duration',
    duration: { value: 6, unit: 'months' },
    price: 10499,
    setupFee: 0,
    taxRate: 0,
    features: [
      { name: 'Gym Access', included: true },
      { name: 'Group Classes', included: true },
      { name: 'Personal Training (monthly)', included: true },
      { name: 'Nutrition Plan', included: true }
    ],
    isActive: true,
    isPopular: false,
    displayOrder: 2
  },
  {
    name: '10 PT Sessions Pack',
    description: 'Pack of 10 personal training sessions valid for 3 months',
    type: 'sessions',
    sessions: 10,
    price: 7999,
    setupFee: 0,
    taxRate: 0,
    features: [
      { name: 'Personal Trainer', included: true },
      { name: 'Body Composition Analysis', included: true }
    ],
    isActive: true,
    isPopular: false,
    displayOrder: 3
  }
];

async function seedAirfit() {
  let connection;

  try {
    console.log('🌱 Seeding Airfit demo data...');

    connection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym_management');
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Cleaning existing Airfit records...');
    const existingOrg = await Organization.findOne({ email: AIRFIT_EMAIL });
    if (existingOrg) {
      await Branch.deleteMany({ organizationId: existingOrg._id });
      await User.deleteMany({ organizationId: existingOrg._id });
      await Organization.deleteOne({ _id: existingOrg._id });
      console.log('  ✅ Removed previous Airfit organization, branches, and users');
    }

    const orphanedUsers = await User.deleteMany({ email: AIRFIT_EMAIL });
    if (orphanedUsers.deletedCount) {
      console.log(`  ✅ Removed ${orphanedUsers.deletedCount} orphaned user(s) with Airfit email`);
    }

    await Plan.deleteMany({ name: { $in: planSeedData.map(plan => plan.name) } });

    console.log('📝 Creating organization...');
    const organization = await Organization.create(organizationSeedData);
    console.log(`  ✅ Organization created: ${organization.name}`);

    console.log('📍 Creating branch...');
    const branch = await Branch.create({
      ...branchSeedData,
      organizationId: organization._id
    });
    console.log(`  ✅ Branch created: ${branch.name}`);

    console.log('👤 Creating owner user...');
    const user = await User.create({
      ...ownerSeedData,
      organizationId: organization._id,
      branchId: branch._id
    });
    organization.createdBy = user._id;
    await organization.save();
    console.log(`  ✅ Owner created: ${user.email}`);

    console.log('🏋️‍♂️ Creating sample plans...');
    for (const plan of planSeedData) {
      await Plan.create({
        ...plan,
        organizationId: organization._id,
        createdBy: user._id
      });
      console.log(`  ✅ Plan created: ${plan.name}`);
    }

    console.log('\n🎉 Airfit data seeded successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 AIRFIT LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Email: ${AIRFIT_EMAIL}`);
    console.log(`🔑 Password: ${AIRFIT_PASSWORD}`);
    console.log('═══════════════════════════════════════════════════════\n');

    await connection.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error while seeding Airfit data:', error);
    if (connection) {
      await connection.disconnect();
    }
    process.exit(1);
  }
}

seedAirfit();


