import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// API base URL - change to your backend server URL
// Using 10.16.11.9 from the error logs instead of 192.168.1.10
const API_URL = 'http://10.16.13.13:3000';  // Remove /api from the URL for socket.io
const API_ENDPOINT = `${API_URL}/api`;  // Keep the /api for REST endpoints

// Headers with authentication token
const getHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

let socket = null;
let socketInitialized = false;

export const initSocket = async (userId) => {
  try {
    if (!userId) {
      return null;
    }
    
    if (socket && socket.connected) {
      console.log('[SOCKET] Socket already connected');
      return socket;
    }
    
    const token = await AsyncStorage.getItem('userToken');
    console.log('[SOCKET] Using auth token:', token ? 'Token exists' : 'No token');
    
    socket = io(API_URL, {  
      auth: {
        token: token
      },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
      console.log('[SOCKET] Connected successfully. Socket ID:', socket.id);
      
      if (userId) {
        console.log('[SOCKET] Registering user ID:', userId);
        socket.emit('register', userId);
      }
    });
    
    socket.on('register_success', (data) => {
      console.log('[SOCKET] Successfully registered socket for user:', data.userId);
      socketInitialized = true;
    });
    
    socket.on('connect_error', (error) => {
      if (__DEV__ || socketInitialized) {
        console.log('[SOCKET] Connection error:', error.message);
      }
    });
    
    socket.on('disconnect', (reason) => {
      if (__DEV__ || socketInitialized) {
        console.log('[SOCKET] Disconnected. Reason:', reason);
      }
    });
    
    return socket;
  } catch (error) {
    if (__DEV__) {
      console.error('[SOCKET] Error initializing socket:', error);
    }
    return null;
  }
};

export const getSocket = () => {
  if (socket && socket.connected) {
    return socket;
  }
  
  if (socketInitialized) {
    console.warn('[SOCKET] Socket requested but not connected');
  }
  
  return null;
};

export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_ENDPOINT}/users/login`, {
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
      
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.user.id.toString());
      
        const profileForStorage = {...data.user};
        if (profileForStorage.avatar) {
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
      const avatarUri = userData.avatar_uri;
      const userDataForRegistration = { ...userData };
      delete userDataForRegistration.avatar_uri;

      const response = await fetch(`${API_ENDPOINT}/users/register`, {
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
      
      if (avatarUri) {
        try {
          // Login to get token
          const loginResponse = await authAPI.login({
            phone_number: userData.phone_number,
            password: userData.password
          });
          
          if (loginResponse && loginResponse.token) {
            await authAPI.uploadAvatar(avatarUri);
          }
        } catch (avatarError) {
          console.error('Avatar upload after registration failed:', avatarError);
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
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userProfile');
      
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
      const response = await fetch(`${API_ENDPOINT}/users/me`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get user profile');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },
  
  updateProfile: async (profileData) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_ENDPOINT}/users/me`, {
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
      let FileSystem = null;
      try {
        FileSystem = require('expo-file-system');
      } catch (error) {
        console.error('[API] Error loading expo-file-system:', error);
      }

      let ImageManipulator = null;
      try {
        ImageManipulator = require('expo-image-manipulator');
      } catch (error) {
        console.error('[API] Error loading expo-image-manipulator:', error);
      }
      
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

        if (fileInfo.size > 1000000) { // If larger than ~1MB
          console.log('[API] Large file detected, will process before upload');
          
          try {
            const manipResult = await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width: 500 } }], // Reduce to 500px width max
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            imageUri = manipResult.uri;
            console.log('[API] Image resized successfully, new URI:', imageUri);
            
            fileInfo = await FileSystem.getInfoAsync(imageUri);
            console.log('[API] Resized file info:', JSON.stringify(fileInfo));
          } catch (resizeError) {
            console.log('[API] Failed to resize image, will continue with original:', resizeError.message);
          }
        }
      } catch (fileError) {
        console.error('[API] File verification error:', fileError);
        throw new Error('Failed to access image file: ' + fileError.message);
      }
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      let filename = 'photo.jpg'; // Default filename
      try {
        if (imageUri && typeof imageUri === 'string') {
          const uriParts = imageUri.split('/');
          if (uriParts && uriParts.length > 0) {
            const lastPart = uriParts[uriParts.length - 1];
            if (lastPart) filename = lastPart;
          }
        }
      } catch (error) {
        console.log('[API] Error extracting filename:', error);
      }
      console.log('[API] Filename:', filename);
      
      let extension = 'jpg'; // Default extension
      let mimeType = 'image/jpeg'; // Default MIME type
      
      try {
        if (filename && typeof filename === 'string' && filename.includes('.')) {
          const parts = filename.split('.');
          if (parts && parts.length > 1) {
            extension = parts[parts.length - 1].toLowerCase();
          }
        }
        
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
      } catch (error) {
        console.log('[API] Error determining MIME type:', error);
      }
      
      console.log('[API] MIME type:', mimeType);
      
      const formData = new FormData();
      
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
      
      const fileObject = {
        uri: processedUri,
        name: filename,
        type: mimeType
      };
      
      console.log('[API] File object:', JSON.stringify(fileObject));
      formData.append('avatar', fileObject);
      
      console.log('[API] FormData created with avatar field');
      
      const endpoint = `${API_ENDPOINT}/users/avatar`;
      console.log('[API] Making request to:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('[API] Response status code:', response.status);
      
      let responseData;
      
      try {
        responseData = await response.json();
        console.log('[API] Response data:', JSON.stringify(responseData));
      } catch (parseError) {
        const textResponse = await response.text();
        console.log('[API] Text response:', textResponse);
        responseData = { message: textResponse };
      }
      
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

  getUserAvatar: async (userId) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_ENDPOINT}/users/${userId}/avatar`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        if (__DEV__) {
          console.log(`[API] User avatar not found for user ID: ${userId}`);
        }
        return null;
      }
      
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          if (base64data && typeof base64data === 'string' && base64data.includes(',')) {
            resolve(base64data.split(',')[1]); // Remove the data:image/jpeg;base64, part
          } else {
            console.log('[API] Invalid base64 data format');
            resolve(null);
          }
        };
        reader.onerror = () => {
          if (__DEV__) {
            console.log(`[API] Error reading avatar blob for user ID: ${userId}`);
          }
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      if (__DEV__) {
        console.log(`[API] User avatar error for user ID: ${userId}:`, error.message);
      }
      return null;
    }
  },
  
  findUserByPhoneNumber: async (phoneNumber) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_ENDPOINT}/users/findByPhone/${phoneNumber}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const data = await response.json();
        throw new Error(data.message || 'Failed to find user');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Find user by phone error:', error);
      return null;
    }
  },

  checkPhoneAvailability: async (phoneNumber) => {
    try {
      const response = await fetch(`${API_ENDPOINT}/users/checkPhoneAvailability/${phoneNumber}`, {
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
      return false;
    }
  },
};

// Contacts API
export const contactsAPI = {
  getAllContacts: async () => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_ENDPOINT}/contacts`, {
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
      const response = await fetch(`${API_ENDPOINT}/contacts/${contactId}`, {
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
      const response = await fetch(`${API_ENDPOINT}/contacts`, {
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
      const response = await fetch(`${API_ENDPOINT}/contacts/${contactId}`, {
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
      const response = await fetch(`${API_ENDPOINT}/contacts/${contactId}`, {
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
      const response = await fetch(`${API_ENDPOINT}/contacts/${contactId}/block`, {
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
      const response = await fetch(`${API_ENDPOINT}/contacts/${contactId}/unblock`, {
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
      const response = await fetch(`${API_ENDPOINT}/messages/conversation/${contactId}`, {
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
      const response = await fetch(`${API_ENDPOINT}/messages/send`, {
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
    const tempId = `temp-${Date.now()}`;
    
    // Make sure IDs are strings to prevent type mismatches
    const messageData = {
      type: 'PRIVATE_MESSAGE',
      payload: {
      senderId: senderId.toString(),
      receiverId: receiverId.toString(),
      content,
        timestamp,
        tempId
      }
    };
    
    console.log('[SOCKET] Sending private message:', JSON.stringify(messageData));
    console.log('[SOCKET-DEBUG] Socket connection status:', socket.connected ? 'Connected' : 'Disconnected');
    console.log('[SOCKET-DEBUG] Socket ID:', socket.id);
    
    socket.emit('message', messageData);
    
    return { 
      id: tempId,
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
      const response = await fetch(`${API_ENDPOINT}/messages/unread/count`, {
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
      const response = await fetch(`${API_ENDPOINT}/messages/unread`, {
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
      const response = await fetch(`${API_ENDPOINT}/messages/conversation/${contactId}`, {
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
    const tempId = `temp-${Date.now()}`;
    
    // Make sure IDs are strings to prevent type mismatches
    const messageData = {
      type: 'PRIVATE_MESSAGE',
      payload: {
      senderId: senderId.toString(),
      receiverId: receiverId.toString(),
      content: message,
        timestamp,
        tempId
      }
    };
    
    console.log('[SOCKET] Sending private message:', JSON.stringify(messageData));
    console.log('[SOCKET-DEBUG] Socket connection status:', socket.connected ? 'Connected' : 'Disconnected');
    console.log('[SOCKET-DEBUG] Socket ID:', socket.id);
    
    socket.emit('message', messageData);
    
    return { timestamp, tempId };
  },
}; 