import mongoose from 'mongoose';
import User from '../models/User.js';
import Quota from '../models/Quota.js';
import ApiKey from '../models/ApiKey.js';
// Environment variables are now hardcoded

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://oloogeorge633_db_user:oloogeorge633_db_user@cluster0.rgrun31.mongodb.net/marketing_firm?retryWrites=true&w=majority&appName=Cluster0'); // Hardcoded MongoDB URI
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Quota.deleteMany({});
    await ApiKey.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@marketingfirm.com',
      password: 'admin123456',
      role: 'admin',
      plan: 'professional',
      isEmailVerified: true
    });

    // Create quota for admin
    await Quota.createForUser(adminUser._id, 'professional');

    // Create API key for admin
    await ApiKey.create({
      name: 'Admin API Key',
      userId: adminUser._id,
      permissions: ['read', 'write', 'admin'],
      isActive: true
    });

    // Create sample users
    const users = [
      {
        name: 'John Smith',
        email: 'john@example.com',
        password: 'password123',
        plan: 'professional'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@company.com',
        password: 'password123',
        plan: 'starter'
      },
      {
        name: 'Mike Chen',
        email: 'mike@startup.io',
        password: 'password123',
        plan: 'free'
      },
      {
        name: 'Emily Davis',
        email: 'emily@enterprise.com',
        password: 'password123',
        plan: 'professional'
      },
      {
        name: 'Alex Rodriguez',
        email: 'alex@agency.com',
        password: 'password123',
        plan: 'starter'
      }
    ];

    for (const userData of users) {
      const user = await User.create(userData);
      await Quota.createForUser(user._id, userData.plan);
      
      // Create API key for each user
      await ApiKey.create({
        name: `${userData.name} API Key`,
        userId: user._id,
        permissions: ['read', 'write'],
        isActive: true
      });
    }

    console.log('Seed data created successfully');
    console.log(`Created ${users.length + 1} users (including admin)`);
    console.log(`Created ${users.length + 1} quotas`);
    console.log(`Created ${users.length + 1} API keys`);

    // Display created users
    const allUsers = await User.find().select('name email role plan');
    console.log('\nCreated users:');
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role} - ${user.plan}`);
    });

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData();
}

export default seedData;
