import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Startup from '../models/Startup.js';
import generateToken from '../utils/generateToken.js';

const buildUserResponse = async (user) => {
  let startup = null;

  if (user.role === 'founder') {
    startup = await Startup.findOne({ founderId: user._id }).select(
      '_id companyName cin mcaStatus valuationAsk pitchDeckUrl isLive'
    );
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    startup: startup
      ? {
          id: startup._id,
          companyName: startup.companyName,
          cin: startup.cin,
          mcaStatus: startup.mcaStatus,
          valuationAsk: startup.valuationAsk,
          pitchDeckUrl: startup.pitchDeckUrl,
          isLive: startup.isLive
        }
      : null
  };
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let assignedRole = role;
    if (normalizedEmail === process.env.OFFICIAL_ADMIN_EMAIL?.toLowerCase().trim()) {
      assignedRole = 'admin';
    } else if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Invalid role. Allowed roles: founder, investor'
      });
    }

    const allowedRoles = ['founder', 'investor', 'admin'];
    if (!allowedRoles.includes(assignedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles: founder, investor'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole
    });

    const token = generateToken(user._id);

    const userResponse = await buildUserResponse(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Register Error:', error.keyValue || error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${duplicateField} already exists. Please use a different one.`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id);

    const userResponse = await buildUserResponse(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const userResponse = await buildUserResponse(req.user);

    return res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Get Me Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};