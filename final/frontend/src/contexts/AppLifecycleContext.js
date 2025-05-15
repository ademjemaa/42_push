import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import contactsService from '../services/contactsService';

// Create Context
export const AppLifecycleContext = createContext();

// Provider Component
export const AppLifecycleProvider = ({ children }) => {
  const [appState, setAppState] = useState(AppState.currentState);
  const [backgroundTime, setBackgroundTime] = useState(null);
  const [backgroundStartTime, setBackgroundStartTime] = useState(null);
  const [showBackgroundAlert, setShowBackgroundAlert] = useState(false);
  const [initialResourcesLoaded, setInitialResourcesLoaded] = useState(false);
  
  // Initialize the app when it first loads
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize the deleted contacts cache
        await contactsService.initDeletedContactsCache();
        console.log('[APP] Deleted contacts cache initialized');
        
        // More initialization tasks can be added here if needed
        
        setInitialResourcesLoaded(true);
      } catch (error) {
        console.error('[APP] Error initializing resources:', error);
        setInitialResourcesLoaded(true); // Set to true anyway to allow app to continue
      }
    };
    
    initializeApp();
  }, []);
  
  // Track app state changes
  useEffect(() => {
    // Handle app state changes
    const handleAppStateChange = (nextAppState) => {
      // Calculate time in background when coming back to active state
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        const now = new Date();
        
        if (backgroundStartTime) {
          const timeInBackground = now - backgroundStartTime;
          setBackgroundTime(timeInBackground);
          setShowBackgroundAlert(true);
          
          // Log for debugging
          console.log(`App was in background for ${Math.round(timeInBackground / 1000)} seconds`);
          
          // Reset the background start time
          setBackgroundStartTime(null);
        }
      } 
      // When going to background, record the time
      else if (nextAppState.match(/inactive|background/) && appState === 'active') {
        setBackgroundStartTime(new Date());
      }
      
      setAppState(nextAppState);
    };
    
    // Subscribe to AppState changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Clean up subscription on unmount
    return () => {
      console.log('Removing AppState listener');
      subscription.remove();
    };
  }, [appState, backgroundStartTime]);
  
  // Function to hide the background time alert
  const hideBackgroundAlert = () => {
    setShowBackgroundAlert(false);
  };
  
  // Format the background time in human-readable format (hh:mm:ss)
  const formatBackgroundTime = () => {
    if (!backgroundTime) return '0:00';
    
    const totalSeconds = Math.round(backgroundTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };
  
  // Context value
  const contextValue = {
    appState,
    backgroundTime,
    formatBackgroundTime,
    showBackgroundAlert,
    hideBackgroundAlert,
    initialResourcesLoaded
  };
  
  return (
    <AppLifecycleContext.Provider value={contextValue}>
      {children}
    </AppLifecycleContext.Provider>
  );
};

// Custom hook to use the AppLifecycleContext
export const useAppLifecycle = () => {
  const context = useContext(AppLifecycleContext);
  
  if (!context) {
    throw new Error('useAppLifecycle must be used within an AppLifecycleProvider');
  }
  
  return context;
}; 