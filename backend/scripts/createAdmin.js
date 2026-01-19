const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel');
    console.log('Connected to MongoDB');

    const adminData = {
      email: 'admin@hostel.com',
      mobile: '9999999999',
      password: 'Admin@123',
      fullName: 'Super Admin',
      superAdmin: true,
      isActive: true,
    };

    const existingAdmin = await Admin.findOne({
      $or: [{ email: adminData.email }, { mobile: adminData.mobile }],
    });

    if (existingAdmin) {
      console.log('Admin already exists with this email or mobile!');
      console.log('Email:', existingAdmin.email);
      console.log('Mobile:', existingAdmin.mobile);
      console.log('Full Name:', existingAdmin.fullName);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    const admin = await Admin.create({
      ...adminData,
      password: hashedPassword,
    });

    console.log('Admin created successfully!');
    console.log('Email:', admin.email);
    console.log('Mobile:', admin.mobile);
    console.log('Password:', adminData.password);
    console.log('Full Name:', admin.fullName);
    console.log('Super Admin:', admin.superAdmin);
    console.log('\nPlease save these credentials securely!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();