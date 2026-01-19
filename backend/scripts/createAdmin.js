const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      resolve(answer);
    });
  });
};

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel');
    console.log('Connected to MongoDB\n');

    const email = await askQuestion('Enter email address: ');
    const password = await askQuestion('Enter password: ');

    readline.close();

    if (!email || !password) {
      console.log('\nError: Email and password are required!');
      process.exit(1);
    }

    const adminData = {
      email: email.trim(),
      password: password,
    };

    const existingAdmin = await Admin.findOne({
      email: adminData.email,
    });

    if (existingAdmin) {
      console.log('\nAdmin already exists with this email!');
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    const admin = await Admin.create({
      ...adminData,
      password: hashedPassword,
    });

    console.log('\nAdmin created successfully!');
    console.log('Email:', admin.email);
    console.log('Password:', adminData.password);
    console.log('\nPlease save these credentials securely!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();