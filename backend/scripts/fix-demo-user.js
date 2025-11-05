import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const DEMO_EMAIL = 'demo@gym.com';
const DEMO_PASSWORD = 'demo123456';

async function fixDemoUser() {
  try {
    console.log('🔧 Fixing demo user...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym_management');
    console.log('✅ Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: DEMO_EMAIL });
    
    if (!user) {
      console.log('❌ User not found. Please run the seed script first.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
    console.log(`🔐 Has password: ${user.password ? 'YES' : 'NO'}`);
    console.log(`✅ Is Active: ${user.isActive}`);

    // Test current password
    if (user.password) {
      const isValid = await user.comparePassword(DEMO_PASSWORD);
      console.log(`🔍 Current password works: ${isValid ? 'YES' : 'NO'}`);
      
      if (!isValid) {
        console.log('🔄 Password doesn\'t match. Resetting password...');
        // Reset password - use updateOne to bypass pre-save hook
        const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        console.log('✅ Password reset successfully');
      }
    } else {
      console.log('🔄 No password found. Setting password...');
      // Set password - use updateOne to bypass pre-save hook
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );
      console.log('✅ Password set successfully');
    }

    // Ensure user is active
    if (!user.isActive) {
      user.isActive = true;
      await user.save();
      console.log('✅ User activated');
    }

    // Reload user to get fresh data
    await user.save();
    const reloadedUser = await User.findById(user._id);
    
    // Verify password works
    const testPassword = await reloadedUser.comparePassword(DEMO_PASSWORD);
    console.log(`\n🎉 Final verification - Password works: ${testPassword ? 'YES ✅' : 'NO ❌'}`);
    
    // Also test with direct bcrypt
    const directTest = await bcrypt.compare(DEMO_PASSWORD, reloadedUser.password);
    console.log(`🔍 Direct bcrypt test: ${directTest ? 'YES ✅' : 'NO ❌'}`);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 DEMO LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Email: ${DEMO_EMAIL}`);
    console.log(`🔑 Password: ${DEMO_PASSWORD}`);
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDemoUser();

