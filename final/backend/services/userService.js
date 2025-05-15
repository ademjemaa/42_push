const { runQuery, getOne, getAll } = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// JWT secret key - in production this should be in an environment variable
const JWT_SECRET = 'your_jwt_secret_key';

// Register a new user
const register = async (userData) => {
  const { phone_number, username, password } = userData;
  
  try {
    // Validate phone number format: 0 followed by 9 digits
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone_number)) {
      throw new Error('Phone number must be 0 followed by 9 digits');
    }
    
    // Check if user already exists
    const existingUser = await getOne('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into database
    const result = await runQuery(
      'INSERT INTO users (phone_number, username, password) VALUES (?, ?, ?)',
      [phone_number, username, hashedPassword]
    );
    
    // Get the created user
    const user = await getOne('SELECT id, phone_number, username, created_at FROM users WHERE id = ?', [result.lastID]);
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Login user
const login = async (phone_number, password) => {
  try {
    // Validate phone number format: 0 followed by 9 digits
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone_number)) {
      throw new Error('Phone number must be 0 followed by 9 digits');
    }
    
    // Find user
    const user = await getOne('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phone_number: user.phone_number },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return {
      token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        username: user.username,
        created_at: user.created_at
      }
    };
  } catch (error) {
    throw error;
  }
};

// Get user by ID
const getUserById = async (userId) => {
  try {
    const user = await getOne(
      'SELECT id, phone_number, username, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Update user avatar
const updateAvatar = async (userId, avatarBuffer) => {
  try {
    // Check if user exists
    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update avatar in database
    await runQuery('UPDATE users SET avatar = ? WHERE id = ?', [avatarBuffer, userId]);
    
    return { success: true, message: 'Avatar updated successfully' };
  } catch (error) {
    throw error;
  }
};

// Get user avatar
const getAvatar = async (userId) => {
  try {
    const user = await getOne('SELECT avatar FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.avatar;
  } catch (error) {
    throw error;
  }
};

// Update user profile
const updateProfile = async (userId, userData) => {
  try {
    const { username } = userData;
    
    await runQuery('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
    
    const updatedUser = await getOne(
      'SELECT id, phone_number, username, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    return updatedUser;
  } catch (error) {
    throw error;
  }
};

// Find user by phone number
const findByPhoneNumber = async (phoneNumber) => {
  try {
    // Validate phone number format: 0 followed by 9 digits
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error('Phone number must be 0 followed by 9 digits');
    }
    
    const user = await getOne(
      'SELECT id, phone_number, username, created_at FROM users WHERE phone_number = ?',
      [phoneNumber]
    );
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Get current user (full profile including avatar)
const getCurrentUser = async (userId) => {
  try {
    const user = await getOne(
      'SELECT id, phone_number, username, created_at, avatar FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Return user with avatar if available
    return {
      id: user.id,
      phone_number: user.phone_number,
      username: user.username,
      created_at: user.created_at,
      avatar: user.avatar ? user.avatar.toString('base64') : null
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  register,
  login,
  getUserById,
  updateAvatar,
  getAvatar,
  updateProfile,
  findByPhoneNumber,
  getCurrentUser
}; 