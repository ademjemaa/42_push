import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, initSocket } from '../services/api';
import { useDispatch } from 'react-redux';

// Create Auth Context
export const AuthContext = createContext();

// Auth Context Provider
export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  
      // Load token and user data from storage on app start  useEffect(() => {    const bootstrapAsync = async () => {      try {        const storedToken = await AsyncStorage.getItem('userToken');        const storedUserId = await AsyncStorage.getItem('userId');        const storedProfile = await AsyncStorage.getItem('userProfile');                if (storedToken && storedUserId) {          // Only log this in development mode          if (__DEV__) {            console.log('[AUTH] Found stored credentials, validating with server...');          }                    // Validate token with server before considering user as logged in          try {            // Set token and user ID temporarily to allow API calls            setUserToken(storedToken);            setUserId(storedUserId);                        // Get current user profile including avatar            const userData = await authAPI.getCurrentUser();                        // Check if userData is null (user not found)            if (!userData) {              console.log('[AUTH] User not found in database, clearing credentials');                            // Clean up stored credentials              await AsyncStorage.removeItem('userToken');              await AsyncStorage.removeItem('userId');              await AsyncStorage.removeItem('userProfile');                            // Reset auth state              setUserToken(null);              setUserId(null);              setUserProfile(null);              return;            }                        if (__DEV__) {              console.log('[AUTH] Token validated successfully');            }                        // Update user profile with fresh data            setUserProfile(userData);                        // Store profile data without the avatar to prevent CursorWindow errors            const profileForStorage = {...userData};            if (profileForStorage.avatar) {              // Just store a flag indicating avatar exists rather than the actual data              profileForStorage.hasAvatar = true;              delete profileForStorage.avatar;            }                        // Update stored profile            await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));                        // No socket initialization here - we'll do it in the main app flow          } catch (error) {            // Don't log the error, just silently clear credentials            // This handles the "User not found" case quietly                        // Clean up stored credentials            await AsyncStorage.removeItem('userToken');            await AsyncStorage.removeItem('userId');            await AsyncStorage.removeItem('userProfile');                        // Reset auth state            setUserToken(null);            setUserId(null);            setUserProfile(null);          }        }      } catch (e) {        // Only log storage errors in development mode        if (__DEV__) {          console.error('[AUTH] Failed to load user data from storage', e);        }      } finally {        setIsLoading(false);      }    };        bootstrapAsync();  }, []);
  
    // Effect to handle socket connection based on authentication state  useEffect(() => {    // We only connect sockets when user is in the main app, not during login/registration    // This will be handled by a specific function called from the main app component        // Still keep the cleanup for logout or component unmount    return () => {      if (dispatch) {        dispatch({ type: 'socket/disconnect' });      }    };  }, [dispatch]);
  
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
      if (response && response.user && response.user.id) {
        try {
          const currentUser = await authAPI.getCurrentUser();
          
          // Only update user profile if we got a valid response
          if (currentUser) {
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
          }
        } catch (profileError) {
          console.error('[AUTH] Error getting user profile after login:', profileError);
          // Continue with login process even if profile fetch fails
        }
      }
      
            // Don't connect socket here - it will be connected when the main app mounts
      
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
      
      // When user logs out, dispatch Redux socket disconnect
      if (dispatch) {
        dispatch({ type: 'socket/disconnect' });
      }
      
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
  
  // Connect socket explicitly - should be called when main app is mounted
  const connectSocket = () => {
    if (userId && userToken && dispatch) {
      console.log('[AUTH] Connecting socket for authenticated user:', userId);
      dispatch({ type: 'socket/connect', payload: userId });
    } else {
      console.log('[AUTH] Cannot connect socket: Missing user ID or token');
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
    connectSocket, // Export the new method
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