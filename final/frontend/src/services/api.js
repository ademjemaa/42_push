import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// API base URL - change to your backend server URL
const API_URL = 'http://10.16.11.9:3000/api';  // Replace 192.168.1.X with your actual machine's IP address

// Headers with authentication token
const getHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Socket connection module
let socket = null;
let socketInitialized = false;

// Initialize socket connection
export const initSocket = async (userId) => {
  try {
    if (!userId) {
      // Don't attempt connection without user ID
      return null;
    }
    
    if (socket && socket.connected) {
      console.log('[SOCKET] Socket already connected');
      return socket;
    }
    
    const token = await AsyncStorage.getItem('userToken');
    console.log('[SOCKET] Using auth token:', token ? 'Token exists' : 'No token');
    
    // Import socket.io-client dynamically to handle Web/Native environments
    const io = require('socket.io-client');
    
    // Create new socket connection
    socket = io(API_URL, {
      auth: {
        token: token
      },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    // Setup socket event listeners
    socket.on('connect', () => {
      console.log('[SOCKET] Connected successfully. Socket ID:', socket.id);
      
      // Register socket for user ID
      if (userId) {
        console.log('[SOCKET] Registering user ID:', userId);
        socket.emit('register', { userId: userId });
      }
    });
    
    socket.on('registered', (data) => {
      console.log('[SOCKET] Successfully registered socket for user:', data.userId);
      socketInitialized = true;
    });
    
    socket.on('connect_error', (error) => {
      // Only log in development mode or if we're already logged in
      if (__DEV__ || socketInitialized) {
        console.log('[SOCKET] Connection error:', error.message);
      }
    });
    
    socket.on('disconnect', (reason) => {
      // Only log in development mode or if we were previously connected
      if (__DEV__ || socketInitialized) {
        console.log('[SOCKET] Disconnected. Reason:', reason);
      }
    });
    
    // Return socket for caller's use
    return socket;
  } catch (error) {
    if (__DEV__) {
      console.error('[SOCKET] Error initializing socket:', error);
    }
    return null;
  }
};

// Get socket instance (returns null if not connected)
export const getSocket = () => {
  if (socket && socket.connected) {
    return socket;
  }
  
  // Don't show warning if not initialized yet - it's normal before login
  if (socketInitialized) {
    console.warn('[SOCKET] Socket requested but not connected');
  }
  
  return null;
};

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Store the token
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.user.id.toString());
        
        // Store user profile without avatar to prevent CursorWindow errors
        const profileForStorage = {...data.user};
        if (profileForStorage.avatar) {
          // Just store a flag indicating avatar exists rather than the actual data
          profileForStorage.hasAvatar = true;
          delete profileForStorage.avatar;
        }
        await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (userData) => {
    try {
      // Extract avatar URI and create a copy of userData without it
      const avatarUri = userData.avatar_uri;
      const userDataForRegistration = { ...userData };
      delete userDataForRegistration.avatar_uri;

      // First register the user
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userDataForRegistration),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // If avatar is provided, log in and upload the avatar
      if (avatarUri) {
        try {
          // Login to get token
          const loginResponse = await authAPI.login({
            phone_number: userData.phone_number,
            password: userData.password
          });
          
          if (loginResponse && loginResponse.token) {
            // Upload avatar
            await authAPI.uploadAvatar(avatarUri);
          }
        } catch (avatarError) {
          console.error('Avatar upload after registration failed:', avatarError);
          // Continue with registration even if avatar upload fails
        }
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      // Clear the token and user data
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userProfile');
      
      // Disconnect socket
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get user profile');
      }
      
      return data;
    } catch (error) {
      // Don't log the error in production
      throw error;
    }
  },
  
  updateProfile: async (profileData) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }
      
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
  
  uploadAvatar: async (imageUri) => {
    console.log('\n[API] ========= USER AVATAR UPLOAD STARTED =========');
    console.log('[API] Image URI:', imageUri);
    
    try {
      // 1. Verify the image file exists
      const FileSystem = require('expo-file-system');
      let fileInfo;
      
      try {
        fileInfo = await FileSystem.getInfoAsync(imageUri);
        console.log('[API] File info:', JSON.stringify(fileInfo));
        
        if (!fileInfo.exists) {
          throw new Error('Image file does not exist at path: ' + imageUri);
        }
        
        console.log('[API] File exists, size:', fileInfo.size);
        
        if (fileInfo.size <= 0) {
          throw new Error('Image file is empty');
        }

        // If file is very large, attempt to resize it
        if (fileInfo.size > 1000000) { // If larger than ~1MB
          console.log('[API] Large file detected, will process before upload');
          
          // We'll use expo-image-manipulator to resize if it's available
          try {
            const ImageManipulator = require('expo-image-manipulator');
            
            // Resize the image to reduce file size
            const manipResult = await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width: 500 } }], // Reduce to 500px width max
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            // Use the resized image instead
            imageUri = manipResult.uri;
            console.log('[API] Image resized successfully, new URI:', imageUri);
            
            // Get new file info
            fileInfo = await FileSystem.getInfoAsync(imageUri);
            console.log('[API] Resized file info:', JSON.stringify(fileInfo));
          } catch (resizeError) {
            console.log('[API] Failed to resize image, will continue with original:', resizeError.message);
            // Continue with original file if resize fails
          }
        }
      } catch (fileError) {
        console.error('[API] File verification error:', fileError);
        throw new Error('Failed to access image file: ' + fileError.message);
      }
      
      // 2. Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // 3. Extract filename from URI
      const uriParts = imageUri.split('/');
      const filename = uriParts[uriParts.length - 1] || 'photo.jpg';
      console.log('[API] Filename:', filename);
      
      // 4. Determine MIME type based on file extension
      const extension = filename.split('.').pop().toLowerCase();
      let mimeType;
      
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
        default:
          mimeType = 'image/jpeg'; // Default to jpeg
      }
      
      console.log('[API] MIME type:', mimeType);
      
      // 5. Create FormData object
      const formData = new FormData();
      
      // 6. Platform-specific URI handling
      let processedUri = imageUri;
      
      if (Platform.OS === 'ios') {
        processedUri = imageUri.replace('file://', '');
      } else if (Platform.OS === 'android') {
        // Android URIs can be used as-is
      } else if (Platform.OS === 'windows') {
        // For Windows, strip the protocol
        processedUri = imageUri.replace(/^.*:\/\//, '');
      }
      
      console.log('[API] Processed URI:', processedUri);
      
      // 7. Append the file to FormData with proper structure
      const fileObject = {
        uri: processedUri,
        name: filename,
        type: mimeType
      };
      
      console.log('[API] File object:', JSON.stringify(fileObject));
      formData.append('avatar', fileObject);
      
      console.log('[API] FormData created with avatar field');
      
      // 8. Log API endpoint
      const endpoint = `${API_URL}/users/avatar`;
      console.log('[API] Making request to:', endpoint);
      
      // 9. Make the request WITHOUT setting Content-Type header (crucial)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // DO NOT set Content-Type - the browser will set it correctly with boundaries
        },
        body: formData
      });
      
      console.log('[API] Response status code:', response.status);
      
      // 10. Handle response
      let responseData;
      
      try {
        responseData = await response.json();
        console.log('[API] Response data:', JSON.stringify(responseData));
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        const textResponse = await response.text();
        console.log('[API] Text response:', textResponse);
        responseData = { message: textResponse };
      }
      
      // 11. Check if request was successful
      if (!response.ok) {
        console.error('[API] Upload failed with status:', response.status);
        throw new Error(responseData.message || 'Failed to upload avatar');
      }
      
      console.log('[API] ========= USER AVATAR UPLOAD SUCCESSFUL =========\n');
      return responseData;
    } catch (error) {
      console.error('[API] Avatar upload error:', error);
      throw error;
    }
  },

  // Get user avatar by ID
  getUserAvatar: async (userId) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        // Instead of throwing an error, silently return null
        if (__DEV__) {
          console.log(`[API] User avatar not found for user ID: ${userId}`);
        }
        return null;
      }
      
      // Get the avatar as blob
      const blob = await response.blob();
      
      // Convert blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          resolve(base64data.split(',')[1]); // Remove the data:image/jpeg;base64, part
        };
        reader.onerror = () => {
          // On error, silently return null instead of rejecting
          if (__DEV__) {
            console.log(`[API] Error reading avatar blob for user ID: ${userId}`);
          }
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      // Log only in development environment and return null
      if (__DEV__) {
        console.log(`[API] User avatar error for user ID: ${userId}:`, error.message);
      }
      return null;
    }
  },
  
  findUserByPhoneNumber: async (phoneNumber) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/users/findByPhone/${phoneNumber}`, {
        method: 'GET',
        headers,
      });
      
      // If response is not ok, handle gracefully
      if (!response.ok) {
        if (response.status === 404) {
          // User not found, return null instead of throwing
          return null;
        }
        const data = await response.json();
        throw new Error(data.message || 'Failed to find user');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Find user by phone error:', error);
      // Return null instead of throwing to handle this gracefully
      return null;
    }
  },

  // Check if a phone number is available for registration (no auth required)
  checkPhoneAvailability: async (phoneNumber) => {
    try {
      // This endpoint doesn't require authentication
      const response = await fetch(`${API_URL}/users/checkPhoneAvailability/${phoneNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to check phone availability');
      }
      
      const data = await response.json();
      return data.available; // Returns true if available, false if taken
    } catch (error) {
      console.error('Check phone availability error:', error);
      // In case of error, assume number is not available to be safe
      return false;
    }
  },
};

// Contacts API
export const contactsAPI = {
  getAllContacts: async () => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get contacts');
      }
      
      return data;
    } catch (error) {
      console.error('Get contacts error:', error);
      throw error;
    }
  },
  
  getContactById: async (contactId) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/contacts/${contactId}`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get contact');
      }
      
      return data;
    } catch (error) {
      console.error('Get contact error:', error);
      throw error;
    }
  },
  
  createContact: async (contactData) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(contactData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create contact');
      }
      
      return data;
    } catch (error) {
      console.error('Create contact error:', error);
      throw error;
    }
  },
  
  updateContact: async (contactId, contactData) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/contacts/${contactId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(contactData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update contact');
      }
      
      return data;
    } catch (error) {
      console.error('Update contact error:', error);
      throw error;
    }
  },
  
  deleteContact: async (contactId) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/contacts/${contactId}`, {
        method: 'DELETE',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete contact');
      }
      
      return data;
    } catch (error) {
      console.error('Delete contact error:', error);
      throw error;
    }
  },
  
  blockContact: async (contactId) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/contacts/${contactId}/block`, {
        method: 'POST',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to block contact');
      }
      
      return data;
    } catch (error) {
      console.error('Block contact error:', error);
      throw error;
    }
  },
  
  unblockContact: async (contactId) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/contacts/${contactId}/unblock`, {
        method: 'POST',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to unblock contact');
      }
      
      return data;
    } catch (error) {
      console.error('Unblock contact error:', error);
      throw error;
    }
  },
};

// Messages API
export const messagesAPI = {
  getConversation: async (contactId) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/messages/conversation/${contactId}`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get conversation');
      }
      
      return data;
    } catch (error) {
      console.error('Get conversation error:', error);
      throw error;
    }
  },
  
  sendMessage: async (receiverId, content) => {
    try {
      console.log('[API] Sending message to receiverId:', receiverId);
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ receiverId, content }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('[API] Send message error:', data.message);
        throw new Error(data.message || 'Failed to send message');
      }
      
      console.log('[API] Message sent successfully, response:', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('[API] Send message error:', error);
      throw error;
    }
  },
  
  // Added a separate function for socket-only message sending (no API call)
  sendSocketOnlyMessage: async (senderId, receiverId, content) => {
    if (!socket) {
      console.error('[SOCKET] Cannot send message: Socket not initialized');
      throw new Error('Socket not connected');
    }
    
    if (!socket.connected) {
      console.error('[SOCKET] Cannot send message: Socket not connected');
      throw new Error('Socket not connected');
    }
    
    const timestamp = new Date().toISOString();
    
    // Make sure IDs are strings to prevent type mismatches
    const messageData = {
      senderId: senderId.toString(),
      receiverId: receiverId.toString(),
      content,
      timestamp
    };
    
    console.log('[SOCKET] Sending private message:', JSON.stringify(messageData));
    console.log('[SOCKET-DEBUG] Socket connection status:', socket.connected ? 'Connected' : 'Disconnected');
    console.log('[SOCKET-DEBUG] Socket ID:', socket.id);
    
    socket.emit('privateMessage', messageData);
    
    return { 
      id: `temp-${Date.now()}`,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      timestamp,
      is_read: true
    };
  },
  
  getUnreadCount: async () => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/messages/unread/count`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get unread count');
      }
      
      return data.count;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  },
  
  getUnreadMessages: async () => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/messages/unread`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get unread messages');
      }
      
      return data;
    } catch (error) {
      console.error('Get unread messages error:', error);
      throw error;
    }
  },
  
  deleteConversation: async (contactId) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/messages/conversation/${contactId}`, {
        method: 'DELETE',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete conversation');
      }
      
      return data;
    } catch (error) {
      console.error('Delete conversation error:', error);
      throw error;
    }
  },
  
  sendSocketMessage: async (senderId, receiverId, message) => {
    if (!socket) {
      console.error('[SOCKET] Cannot send message: Socket not initialized');
      throw new Error('Socket not connected');
    }
    
    if (!socket.connected) {
      console.error('[SOCKET] Cannot send message: Socket not connected');
      throw new Error('Socket not connected');
    }
    
    const timestamp = new Date().toISOString();
    
    // Make sure IDs are strings to prevent type mismatches
    const messageData = {
      senderId: senderId.toString(),
      receiverId: receiverId.toString(),
      content: message,
      timestamp
    };
    
    console.log('[SOCKET] Sending private message:', JSON.stringify(messageData));
    console.log('[SOCKET-DEBUG] Socket connection status:', socket.connected ? 'Connected' : 'Disconnected');
    console.log('[SOCKET-DEBUG] Socket ID:', socket.id);
    
    socket.emit('privateMessage', messageData);
    
    return { timestamp };
  },
}; 