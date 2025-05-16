const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname) || '.jpg';
    cb(null, 'user-avatar-' + uniqueSuffix + fileExtension);
  }
});

// Configure multer upload
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log('[MULTER] Filtering file:', file.originalname, file.mimetype);
    
    // Check if it's an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.post('/register', async (req, res) => {
  try {
    const userData = req.body;
    
    if (!userData.phone_number || !userData.password) {
      return res.status(400).json({ message: 'Phone number and password are required' });
    }
    
    const user = await userService.register(userData);
    res.status(201).json(user);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone_number, password } = req.body;
    
    if (!phone_number || !password) {
      return res.status(400).json({ message: 'Phone number and password are required' });
    }
    
    const result = await userService.login(phone_number, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message || 'Login failed' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await userService.getCurrentUser(req.user.userId);
    
    // Check if user is null (not found)
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found or deleted',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(400).json({ message: error.message || 'Failed to get user data' });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const userData = req.body;
    const updatedUser = await userService.updateProfile(req.user.userId, userData);
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ message: error.message || 'Failed to update profile' });
  }
});

router.post('/avatar', auth, (req, res) => {
  console.log('\n[USER-UPLOAD] ========= USER AVATAR UPLOAD REQUEST STARTED =========');
  console.log('[USER-UPLOAD] User ID:', req.user.userId);
  console.log('[USER-UPLOAD] Content-Type:', req.headers['content-type']);
  
  console.log('[USER-UPLOAD] Request headers:');
  Object.keys(req.headers).forEach(key => {
    console.log(`[USER-UPLOAD] - ${key}: ${req.headers[key]}`);
  });

  const singleUpload = upload.single('avatar');
  
  singleUpload(req, res, async function(multerError) {
    try {
      if (multerError) {
        console.error('[USER-UPLOAD] Multer error:', multerError);
        return res.status(400).json({ 
          message: `File upload error: ${multerError.message}` 
        });
      }
      
      console.log('[USER-UPLOAD] Multer processing completed');
      
      if (!req.file) {
        console.error('[USER-UPLOAD] No file received in the request. Fields received:', Object.keys(req.body));
        return res.status(400).json({ message: 'No avatar image provided' });
      }
      
      console.log('[USER-UPLOAD] File received:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename,
        path: req.file.path
      });
      
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        console.log('[USER-UPLOAD] File read as buffer, size:', fileBuffer.length);
        
        if (fileBuffer.length === 0) {
          console.error('[USER-UPLOAD] Error: File buffer is empty');
          return res.status(400).json({ message: 'Uploaded file is empty' });
        }
        
        console.log('[USER-UPLOAD] Updating user avatar in database...');
        await userService.updateAvatar(req.user.userId, fileBuffer);
        console.log('[USER-UPLOAD] User avatar updated successfully in database');
        
        try {
          fs.unlinkSync(req.file.path);
          console.log('[USER-UPLOAD] Temporary file deleted');
        } catch (cleanupError) {
          console.error('[USER-UPLOAD] Error cleaning up temporary file:', cleanupError);
        }
        
        console.log('[USER-UPLOAD] ========= USER AVATAR UPLOAD COMPLETED SUCCESSFULLY =========\n');
        return res.status(200).json({ 
          success: true, 
          message: 'User avatar updated successfully' 
        });
        
      } catch (processingError) {
        console.error('[USER-UPLOAD] Error processing file:', processingError);
        
        try {
          if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
            console.log('[USER-UPLOAD] Cleaned up temporary file after error');
          }
        } catch (cleanupError) {
          console.error('[USER-UPLOAD] Error during cleanup:', cleanupError);
        }
        
        return res.status(500).json({ 
          message: `Error processing user avatar: ${processingError.message}` 
        });
      }
      
    } catch (error) {
      console.error('[USER-UPLOAD] Unhandled error in user avatar upload:', error);
      return res.status(500).json({ 
        message: `Server error: ${error.message}` 
      });
    }
  });
});

router.get('/avatar', auth, async (req, res) => {
  try {
    const avatar = await userService.getAvatar(req.user.userId);
    
    if (!avatar) {
      return res.status(404).json({ 
        message: 'Avatar not found or user does not exist',
        code: 'AVATAR_NOT_FOUND'
      });
    }
    
    // Set content type and send the image
    res.contentType('image/jpeg');
    res.end(avatar);
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ 
      message: 'An error occurred while retrieving the avatar',
      code: 'SERVER_ERROR'
    });
  }
});

router.get('/:id/avatar', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    const avatar = await userService.getAvatar(userId);
    
    if (!avatar) {
      return res.status(404).json({ 
        message: 'Avatar not found or user does not exist',
        code: 'AVATAR_NOT_FOUND'
      });
    }
    
    // Set content type and send the image
    res.contentType('image/jpeg');
    res.end(avatar);
  } catch (error) {
    console.error('Get user avatar error:', error);
    res.status(500).json({ 
      message: 'An error occurred while retrieving the avatar',
      code: 'SERVER_ERROR'
    });
  }
});

router.get('/findByPhone/:phoneNumber', auth, async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        message: 'Phone number is required',
        code: 'MISSING_PHONE_NUMBER'
      });
    }
    
    const user = await userService.findByPhoneNumber(phoneNumber);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found with this phone number',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json(user);
  } catch (error) {
    // For database or unexpected server errors
    console.error('Find user by phone error:', error);
    res.status(500).json({ 
      message: 'An unexpected error occurred while searching for the user',
      code: 'SERVER_ERROR'
    });
  }
});

// Check if phone number is available for registration (no auth required)
router.get('/checkPhoneAvailability/:phoneNumber', async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber;
    console.log(phoneNumber);
    
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Validate phone number format
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ 
        message: 'Invalid phone number format',
        available: false 
      });
    }
    
    const user = await userService.findByPhoneNumber(phoneNumber);
    
    // Return whether the phone number is available (true = available, false = taken)
    res.json({ 
      available: !user,
      message: user ? 'Phone number is already registered' : 'Phone number is available'
    });
  } catch (error) {
    console.error('Check phone availability error:', error);
    res.status(400).json({ 
      message: error.message || 'Failed to check phone availability',
      available: false
    });
  }
});

module.exports = router; 