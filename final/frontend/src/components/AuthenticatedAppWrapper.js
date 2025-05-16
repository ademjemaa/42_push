import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUserId } from '../redux/slices/authSlice';

/**
 * AuthenticatedAppWrapper component handles socket connection for authenticated users.
 * It connects the socket when a user is authenticated and ensures socket events are set up.
 */
const AuthenticatedAppWrapper = ({ children }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userId = useSelector(selectUserId);
  
  // Connect socket when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('[AUTH-WRAPPER] User authenticated, connecting socket');
      dispatch({ type: 'socket/connect', payload: userId });
      
      // Clean up on unmount or when auth state changes
      return () => {
        // Only disconnect if we were previously connected
        if (isAuthenticated && userId) {
          console.log('[AUTH-WRAPPER] Cleaning up socket connection');
          dispatch({ type: 'socket/disconnect' });
        }
      };
    }
  }, [isAuthenticated, userId, dispatch]);
  
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AuthenticatedAppWrapper; 