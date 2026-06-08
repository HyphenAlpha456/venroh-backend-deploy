import dns from "dns";
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';


const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({
      email: 'admin@example.com'
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.create({
      name: 'Platform Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    });

    console.log('Admin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Admin seed error:', error);
    process.exit(1);
  }
};

 dns.setServers(["1.1.1.1", "8.8.8.8"]);

createAdmin();