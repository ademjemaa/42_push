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
      
      if (response && response.user && response.user.id) {
        try {
          const currentUser = await authAPI.getCurrentUser();
          
          if (currentUser) {
            setUserProfile(currentUser);
            
            const profileForStorage = {...currentUser};
            if (profileForStorage.avatar) {
              profileForStorage.hasAvatar = true;
              delete profileForStorage.avatar;
            }
            
            await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
          }
        } catch (profileError) {
          console.error('[AUTH] Error getting user profile after login:', profileError);
        }
      }
      
      
      return true;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
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
  
  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[AUTH] Logging out user');
      await authAPI.logout();
      
      const keysToRemove = [
        'userToken', 
        'userId', 
        'userProfile',
      ];
      
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      
      setUserToken(null);
      setUserId(null);
      setUserProfile(null);
      
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
  
  const updateProfile = async (profileData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedProfile = await authAPI.updateProfile(profileData);
      
      if (userProfile && userProfile.avatar) {
        updatedProfile.avatar = userProfile.avatar;
      }
      
      setUserProfile(updatedProfile);
      
      const profileForStorage = {...updatedProfile};
      if (profileForStorage.avatar) {
        profileForStorage.hasAvatar = true;
        delete profileForStorage.avatar;
      }
      
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
      
      return updatedProfile;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  const uploadAvatar = async (imageUri) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authAPI.uploadAvatar(imageUri);
      
      const updatedProfile = await authAPI.getCurrentUser();
      setUserProfile(updatedProfile);
      
      const profileForStorage = {...updatedProfile};
      if (profileForStorage.avatar) {
        profileForStorage.hasAvatar = true;
        delete profileForStorage.avatar;
      }
      
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
      
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  const connectSocket = () => {
    if (userId && userToken && dispatch) {
      console.log('[AUTH] Connecting socket for authenticated user:', userId);
      dispatch({ type: 'socket/connect', payload: userId });
    } else {
      console.log('[AUTH] Cannot connect socket: Missing user ID or token');
    }
  };
  
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
    connectSocket, 
  };
  
  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 