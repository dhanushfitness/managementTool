import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

dotenv.config();

const DEMO_EMAIL = 'demo@gym.com';

async function verifyDemoUser() {
  try {
    console.log('🔍 Verifying demo user setup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym_management');
    console.log('✅ Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: DEMO_EMAIL }).populate('organizationId');
    
    if (!user) {
      console.log('❌ User not found. Please run the seed script first.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
    console.log(`✅ Is Active: ${user.isActive}`);
    console.log(`📧 Organization ID: ${user.organizationId ? user.organizationId._id : 'NULL ❌'}`);

    // Check if organizationId field exists (even if not populated)
    const userWithOrgId = await User.findOne({ email: DEMO_EMAIL }).select('organizationId');
    
    // If organizationId exists but organization doesn't, find or create one
    if (userWithOrgId.organizationId && !user.organizationId) {
      console.log('⚠️  OrganizationId exists but organization not found. Finding or creating organization...');
      
      // Try to find existing organization by email
      let org = await Organization.findOne({ email: DEMO_EMAIL });
      
      if (!org) {
        // Try to find by createdBy
        org = await Organization.findOne({ createdBy: user._id });
        
        if (!org) {
          // Create new organization
          org = await Organization.create({
            name: 'FitLife Gym',
            email: DEMO_EMAIL,
            phone: '+1234567890',
            createdBy: user._id,
            isActive: true
          });
          console.log('✅ Created new organization');
        } else {
          console.log('✅ Found organization created by this user');
        }
      } else {
        console.log('✅ Found existing organization by email');
        // Ensure it's active
        if (!org.isActive) {
          org.isActive = true;
          await org.save();
          console.log('✅ Activated organization');
        }
      }
      
      // Check for duplicate users with same email+orgId
      const duplicateUsers = await User.find({ 
        email: DEMO_EMAIL,
        organizationId: org._id,
        _id: { $ne: user._id }
      });
      
      if (duplicateUsers.length > 0) {
        console.log(`⚠️  Found ${duplicateUsers.length} duplicate user(s). Removing...`);
        for (const dup of duplicateUsers) {
          await User.deleteOne({ _id: dup._id });
          console.log(`  ✅ Deleted duplicate user: ${dup._id}`);
        }
      }
      
      // Update user with organization
      await User.updateOne(
        { _id: user._id },
        { $set: { organizationId: org._id } }
      );
      console.log('✅ Linked user to organization');
      
      // Reload user
      const updatedUser = await User.findOne({ email: DEMO_EMAIL }).populate('organizationId');
      console.log(`✅ Organization Name: ${updatedUser.organizationId.name}`);
      console.log(`✅ Organization Active: ${updatedUser.organizationId.isActive}`);
    } else if (!user.organizationId && !userWithOrgId.organizationId) {
      console.log('\n❌ ERROR: User has no organization!');
      console.log('🔧 Fixing by finding or creating organization...');
      
      // Try to find existing organization
      let org = await Organization.findOne({ email: DEMO_EMAIL });
      
      if (!org) {
        // Try to find any organization created by this user
        org = await Organization.findOne({ createdBy: user._id });
        
        if (!org) {
          // Create organization
          org = await Organization.create({
            name: 'FitLife Gym',
            email: DEMO_EMAIL,
            phone: '+1234567890',
            createdBy: user._id
          });
          console.log('✅ Created new organization');
        } else {
          console.log('✅ Found organization created by this user');
        }
      } else {
        console.log('✅ Found existing organization');
      }
      
      // Check if another user already has this email+orgId combo
      const existingUser = await User.findOne({ 
        email: DEMO_EMAIL, 
        organizationId: org._id,
        _id: { $ne: user._id }
      });
      
      if (existingUser) {
        console.log('⚠️  Another user with same email+org exists. Deleting duplicate...');
        await User.deleteOne({ _id: existingUser._id });
      }
      
      // Update user's organizationId
      await User.updateOne(
        { _id: user._id },
        { $set: { organizationId: org._id } }
      );
      console.log('✅ Updated user organizationId');
      
      // Reload user
      const updatedUser = await User.findOne({ email: DEMO_EMAIL }).populate('organizationId');
      console.log(`✅ Updated Organization ID: ${updatedUser.organizationId._id}`);
      console.log(`✅ Organization Name: ${updatedUser.organizationId.name}`);
    } else if (userWithOrgId.organizationId && !user.organizationId) {
      // OrganizationId exists but populate failed - reload with populate
      console.log('⚠️  OrganizationId exists but populate failed. Reloading...');
      const reloadedUser = await User.findOne({ email: DEMO_EMAIL }).populate('organizationId');
      if (reloadedUser.organizationId) {
        console.log(`✅ Organization Name: ${reloadedUser.organizationId.name}`);
        console.log(`✅ Organization Active: ${reloadedUser.organizationId.isActive}`);
      } else {
        console.log('❌ Organization not found. Please check database.');
      }
    } else {
      console.log(`✅ Organization Name: ${user.organizationId.name}`);
      console.log(`✅ Organization Active: ${user.organizationId.isActive}`);
    }

    console.log('\n🎉 User verification completed!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyDemoUser();

