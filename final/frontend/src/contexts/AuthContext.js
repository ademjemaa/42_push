import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, initSocket } from '../services/api';

// Create Auth Context
export const AuthContext = createContext();

// Auth Context Provider
export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  
  // Load token and user data from storage on app start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedProfile = await AsyncStorage.getItem('userProfile');
        
        if (storedToken && storedUserId) {
          console.log('[AUTH] Found stored credentials, validating with server...');
          
          // Validate token with server before considering user as logged in
          try {
            // Set token and user ID temporarily to allow API calls
            setUserToken(storedToken);
            setUserId(storedUserId);
            
            // Get current user profile including avatar
            const userData = await authAPI.getCurrentUser();
            
            if (userData) {
              console.log('[AUTH] Token validated successfully');
              
              // Update user profile with fresh data
              setUserProfile(userData);
              
              // Store profile data without the avatar to prevent CursorWindow errors
              const profileForStorage = {...userData};
              if (profileForStorage.avatar) {
                // Just store a flag indicating avatar exists rather than the actual data
                profileForStorage.hasAvatar = true;
                delete profileForStorage.avatar;
              }
              
              // Update stored profile
              await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
              
              // Only initialize socket if we have a valid user
              if (userData && userData.id) {
                console.log('[AUTH] Initializing socket with validated user ID:', userData.id);
                const socket = await initSocket(userData.id.toString());
                
                // Setup socket event listener for invalid user detection
                if (socket) {
                  socket.on('client_event', (event) => {
                    if (event.type === 'invalid_user_detected') {
                      console.log('[AUTH] Received invalid user notification from socket, logging out...');
                      // Log out automatically since the user record doesn't exist anymore
                      logout();
                    }
                  });
                }
              } else {
                console.log('[AUTH] Not initializing socket - missing valid user data');
              }
            }
          } catch (error) {
            console.error('[AUTH] Error validating token:', error);
            // On error, clear credentials
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('userProfile');
            setUserToken(null);
            setUserId(null);
            setUserProfile(null);
          }
        }
      } catch (e) {
        console.error('[AUTH] Failed to load user data from storage', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    bootstrapAsync();
  }, []);
  
  // Login function
  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[AUTH] Attempting login with credentials:', 
        JSON.stringify({ phone_number: credentials.phone_number, passwordProvided: !!credentials.password }));
      
      const response = await authAPI.login(credentials);
      
      if (!response || !response.user || !response.token) {
        throw new Error('Invalid login response from server');
      }
      
      console.log('[AUTH] Login successful for user ID:', response.user.id);
      
      setUserToken(response.token);
      setUserId(response.user.id.toString());
      
      // Fetch the complete user profile including avatar
      const currentUser = await authAPI.getCurrentUser();
      setUserProfile(currentUser);
      
      // Store profile data without the avatar to prevent CursorWindow errors
      const profileForStorage = {...currentUser};
      if (profileForStorage.avatar) {
        // Just store a flag indicating avatar exists rather than the actual data
        profileForStorage.hasAvatar = true;
        delete profileForStorage.avatar;
      }
      
      // Update stored profile with filtered data
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
      
      return true;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Register function
  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.register(userData);
      return response;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[AUTH] Logging out user');
      await authAPI.logout();
      
      // Clear all auth-related items from storage
      const keysToRemove = [
        'userToken', 
        'userId', 
        'userProfile',
        // Add any other auth-related keys here
      ];
      
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      
      // Reset state
      setUserToken(null);
      setUserId(null);
      setUserProfile(null);
      
      console.log('[AUTH] User logged out successfully');
    } catch (e) {
      setError(e.message);
      console.error('[AUTH] Logout error:', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update user profile
  const updateProfile = async (profileData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedProfile = await authAPI.updateProfile(profileData);
      
      // If we previously had a complete profile with avatar, preserve it
      if (userProfile && userProfile.avatar) {
        updatedProfile.avatar = userProfile.avatar;
      }
      
      setUserProfile(updatedProfile);
      
      // Store profile data without the avatar to prevent CursorWindow errors
      const profileForStorage = {...updatedProfile};
      if (profileForStorage.avatar) {
        // Just store a flag indicating avatar exists rather than the actual data
        profileForStorage.hasAvatar = true;
        delete profileForStorage.avatar;
      }
      
      // Update stored profile
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
      
      return updatedProfile;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Upload avatar
  const uploadAvatar = async (imageUri) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authAPI.uploadAvatar(imageUri);
      
      // Get updated profile with avatar
      const updatedProfile = await authAPI.getCurrentUser();
      setUserProfile(updatedProfile);
      
      // Store profile data without the avatar to prevent CursorWindow errors
      const profileForStorage = {...updatedProfile};
      if (profileForStorage.avatar) {
        // Just store a flag indicating avatar exists rather than the actual data
        profileForStorage.hasAvatar = true;
        delete profileForStorage.avatar;
      }
      
      // Update stored profile
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
      
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Auth context value
  const authContext = {
    isLoading,
    userToken,
    userId,
    userProfile,
    error,
    login,
    register,
    logout,
    updateProfile,
    uploadAvatar,
  };
  
  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Context Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 