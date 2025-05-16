const { runQuery, getOne, getAll } = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = 'your_jwt_secret_key';

const register = async (userData) => {
  const { phone_number, username, password } = userData;
  
  try {
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone_number)) {
      throw new Error('Phone number must be 0 followed by 9 digits');
    }
    
    const existingUser = await getOne('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
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

const login = async (phone_number, password) => {
  try {
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone_number)) {
      throw new Error('Phone number must be 0 followed by 9 digits');
    }
    
    const user = await getOne('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
    if (!user) {
      throw new Error('User not found');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }
    
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

const updateAvatar = async (userId, avatarBuffer) => {
  try {
    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('User not found');
    }
    
    await runQuery('UPDATE users SET avatar = ? WHERE id = ?', [avatarBuffer, userId]);
    
    return { success: true, message: 'Avatar updated successfully' };
  } catch (error) {
    throw error;
  }
};

const getAvatar = async (userId) => {
  try {
    const user = await getOne('SELECT avatar FROM users WHERE id = ?', [userId]);
    if (!user) {
      console.log(`User with ID ${userId} not found when fetching avatar`);
      return null;
    }
    
    return user.avatar;
  } catch (error) {
    throw error;
  }
};

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

const findByPhoneNumber = async (phoneNumber) => {
  try {
    // Validate phone number format, but don't throw if invalid
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      console.log(`Invalid phone number format: ${phoneNumber}`);
      return null;
    }
    
    const user = await getOne(
      'SELECT id, phone_number, username, created_at FROM users WHERE phone_number = ?',
      [phoneNumber]
    );
    
    // Just return null if user not found (don't throw)
    return user;
  } catch (error) {
    // Only throw database/server errors
    throw error;
  }
};

const getCurrentUser = async (userId) => {
  try {
    const user = await getOne(
      'SELECT id, phone_number, username, created_at, avatar FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      console.log(`User with ID ${userId} not found in database`);
      return null;
    }
    
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