import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  bootstrapAuth, 
  loginUser, 
  registerUser, 
  logoutUser, 
  updateUserProfile, 
  uploadUserAvatar,
  selectIsAuthenticated,
  selectIsLoading,
  selectUserProfile,
  selectUserId,
  selectAuthError,
  resetAuthError
} from '../redux/slices/authSlice';
import { AuthContext } from '../contexts/AuthContext';

/**
 * AuthReduxProvider bridges Redux auth state with the existing AuthContext
 * for backward compatibility during transition to Redux.
 * 
 * This allows existing components to continue using useAuth() hook
 * while the auth state is actually managed by Redux.
 */
export const AuthReduxProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [userToken, setUserToken] = useState(null);
  
  // Select auth state from Redux
  const isLoading = useSelector(selectIsLoading);
  const userProfile = useSelector(selectUserProfile);
  const userId = useSelector(selectUserId);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const error = useSelector(selectAuthError);

  // Bootstrap auth on mount
  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);
  
  // Get token from AsyncStorage when auth state changes
  useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated) {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } else {
        setUserToken(null);
      }
    };
    
    getToken();
  }, [isAuthenticated]);

  // Create auth context value from Redux state
  const authContextValue = {
    isLoading,
    userToken,
    userId,
    userProfile,
    error,
    
    // Map context methods to Redux actions
    login: async (credentials) => {
      try {
        await dispatch(loginUser(credentials)).unwrap();
        return true;
      } catch (error) {
        throw error;
      }
    },
    
    register: async (userData) => {
      try {
        return await dispatch(registerUser(userData)).unwrap();
      } catch (error) {
        throw error;
      }
    },
    
    logout: async () => {
      try {
        await dispatch(logoutUser()).unwrap();
        return { success: true };
      } catch (error) {
        throw error;
      }
    },
    
    updateProfile: async (profileData) => {
      try {
        return await dispatch(updateUserProfile(profileData)).unwrap();
      } catch (error) {
        throw error;
      }
    },
    
    uploadAvatar: async (imageUri) => {
      try {
        return await dispatch(uploadUserAvatar(imageUri)).unwrap();
      } catch (error) {
        throw error;
      }
    },
    
    // Connect socket method
    connectSocket: () => {
      if (userId && userToken && dispatch) {
        console.log('[AUTH-REDUX] Connecting socket for authenticated user:', userId);
        dispatch({ type: 'socket/connect', payload: userId });
      } else {
        console.log('[AUTH-REDUX] Cannot connect socket: Missing user ID or token');
      }
    },
  };

  // Provide the context with values from Redux
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthReduxProvider; 