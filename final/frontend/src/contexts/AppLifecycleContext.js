import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppLifecycleContext = createContext();

export const AppLifecycleProvider = ({ children }) => {
  // Initialize appState with current state
  const [appState, setAppState] = useState(AppState.currentState);
  const [backgroundTime, setBackgroundTime] = useState(null);
  const [backgroundStartTime, setBackgroundStartTime] = useState(null);
  const [showBackgroundAlert, setShowBackgroundAlert] = useState(false);
  const [initialResourcesLoaded, setInitialResourcesLoaded] = useState(false);
  
  // Add a refresh counter to force updates
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Refs to track state changes and prevent race conditions
  const showBackgroundAlertRef = useRef(false);
  const appStateRef = useRef(appState);
  const backgroundStartTimeRef = useRef(null);
  const isInitialMount = useRef(true);
  
  // Function to hide the background time alert
  const hideBackgroundAlert = useCallback(() => {
    console.log('[LIFECYCLE] Hiding background alert');
    setShowBackgroundAlert(false);
    showBackgroundAlertRef.current = false;
  }, []);
  
  // Function to force refresh the context consumers
  const refreshContext = useCallback(() => {
    console.log('[LIFECYCLE] Forcing context refresh');
    setRefreshCounter(prev => prev + 1);
  }, []);
  
  // Directly force show the background alert (for testing and fixing issues)
  const forceShowAlert = useCallback((time = 10000) => {
    console.log('[LIFECYCLE] Force showing background alert with time:', time);
    setBackgroundTime(time);
    setShowBackgroundAlert(true);
    showBackgroundAlertRef.current = true;
    refreshContext();
  }, [refreshContext]);
  
  // Update refs when state changes
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);
  
  useEffect(() => {
    backgroundStartTimeRef.current = backgroundStartTime;
  }, [backgroundStartTime]);
  
  useEffect(() => {
    showBackgroundAlertRef.current = showBackgroundAlert;
    console.log('[LIFECYCLE] showBackgroundAlert changed to:', showBackgroundAlert);
    
    // Force a refresh after setting the alert state
    if (showBackgroundAlert) {
      // Multiple refresh calls to ensure consumers update
      setTimeout(() => refreshContext(), 50);
      setTimeout(() => refreshContext(), 200);
    }
  }, [showBackgroundAlert, refreshContext]);
  
  // Initialize the app when it first loads
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[LIFECYCLE] App initializing, current state:', appState);
        
        // Make sure we start with alert hidden
        setShowBackgroundAlert(false);
        showBackgroundAlertRef.current = false;
        
        // If we're initializing and already active, set up for background detection
        if (appState === 'active') {
          console.log('[LIFECYCLE] App starts in active state, setting up for background');
          setBackgroundTime(null);
          backgroundStartTimeRef.current = null;
        } 
        // If we're starting in background/inactive, prepare for return to foreground
        else if (appState === 'background' || appState === 'inactive') {
          console.log('[LIFECYCLE] App starts in background, preparing for foreground return');
          const startTime = new Date();
          backgroundStartTimeRef.current = startTime;
          setBackgroundStartTime(startTime);
        }
        
        setInitialResourcesLoaded(true);
        isInitialMount.current = false;
      } catch (error) {
        console.error('[LIFECYCLE] Error initializing resources:', error);
        setInitialResourcesLoaded(true); // Set to true anyway to allow app to continue
        isInitialMount.current = false;
      }
    };
    
    initializeApp();
  }, [appState]);
  
  // Track app state changes
  useEffect(() => {
    console.log('[LIFECYCLE] Setting up AppState change listener for', appState);
    
    // Handle app state changes
    const handleAppStateChange = (nextAppState) => {
      console.log(`[LIFECYCLE] App state changing from ${appState} to ${nextAppState}`);
      
      // Calculate time in background when coming back to active state
      if ((appState === 'background' || appState === 'inactive') && nextAppState === 'active') {
        console.log('[LIFECYCLE] App is coming to foreground from background/inactive');
        const now = new Date();
        
        if (backgroundStartTimeRef.current) {
          const timeInBackground = now - backgroundStartTimeRef.current;
          const secondsInBackground = Math.round(timeInBackground / 1000);
          console.log(`[LIFECYCLE] Time in background: ${secondsInBackground} seconds`);
          
          // Only show alert if background time is significant (more than 1 second)
          if (timeInBackground > 1000) {
            // First update the time
            setBackgroundTime(timeInBackground);
            
            // Log at each step to help debugging
            console.log('[LIFECYCLE] Setting showBackgroundAlert to TRUE');
            
            // ALWAYS directly set the state to true - no timeout
            setShowBackgroundAlert(true);
            showBackgroundAlertRef.current = true;
            console.log('[LIFECYCLE] showBackgroundAlert has been set to TRUE');
            console.log('[LIFECYCLE] Current state after setting alert:', { 
              showBackgroundAlert: true, 
              backgroundTime: timeInBackground,
              appState: nextAppState
            });
            
            // Multiple refresh calls to ensure consumers update
            refreshContext();
            setTimeout(() => refreshContext(), 100);
            setTimeout(() => refreshContext(), 500);
          } else {
            console.log('[LIFECYCLE] Background time too short, not showing alert');
          }
          
          // Reset the background start time
          setBackgroundStartTime(null);
          backgroundStartTimeRef.current = null;
        } else {
          console.log('[LIFECYCLE] No background start time recorded, setting one anyway for next background session');
          // Even if no previous background time was recorded, we still need to prepare for the next background session
          setBackgroundStartTime(null);
          backgroundStartTimeRef.current = null;
        }
      } 
      // When going to background, record the time
      else if ((nextAppState === 'background' || nextAppState === 'inactive') && appState === 'active') {
        console.log('[LIFECYCLE] App is going to background/inactive from foreground');
        const startTime = new Date();
        console.log('[LIFECYCLE] Recording background start time:', startTime.toISOString());
        
        // Always set both the state and the ref to ensure consistency
        setBackgroundStartTime(startTime);
        backgroundStartTimeRef.current = startTime;
        
        // Log confirmation that we've set the time
        console.log('[LIFECYCLE] Background start time has been recorded');
        
        // Hide alert if it's showing
        if (showBackgroundAlertRef.current) {
          console.log('[LIFECYCLE] Hiding background alert as app is going to background');
          setShowBackgroundAlert(false);
          showBackgroundAlertRef.current = false;
        }
      }
      
      // Update app state after handling logic
      setAppState(nextAppState);
      appStateRef.current = nextAppState;
    };
    
    // Subscribe to AppState changes - using the newer API
    let subscription;
    
    try {
      // Try the newer API first (React Native 0.65+)
      subscription = AppState.addEventListener('change', handleAppStateChange);
      console.log('[LIFECYCLE] Using new AppState.addEventListener API');
    } catch (error) {
      // Fall back to older API for older React Native versions
      console.log('[LIFECYCLE] Using legacy AppState.addEventListener API');
      AppState.addEventListener('change', handleAppStateChange);
      
      // Create a mock subscription for cleanup
      subscription = {
        remove: () => {
          AppState.removeEventListener('change', handleAppStateChange);
        }
      };
    }
    
    // Manual initial check when this effect runs
    if (appState === 'active') {
      console.log('[LIFECYCLE] Setting initial background start time as null since app is active');
      console.log('[LIFECYCLE] App is currently active, will track background time when app goes to background');
      setBackgroundStartTime(null);
      backgroundStartTimeRef.current = null;
    } else if (appState === 'background' || appState === 'inactive') {
      console.log('[LIFECYCLE] App starting in background state, recording start time');
      const startTime = new Date();
      setBackgroundStartTime(startTime);
      backgroundStartTimeRef.current = startTime;
      console.log('[LIFECYCLE] Background start time set to:', startTime.toISOString());
    }
    
    // Clean up subscription on unmount
    return () => {
      console.log('[LIFECYCLE] Removing AppState listener');
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, [appState, refreshContext]);
  
  // Format the background time in human-readable format (hh:mm:ss)
  const formatBackgroundTime = useCallback(() => {
    if (!backgroundTime) {
      console.log('[LIFECYCLE] formatBackgroundTime called with no backgroundTime');
      return '0:00';
    }
    
    const totalSeconds = Math.round(backgroundTime / 1000);
    console.log('[LIFECYCLE] Formatting time:', backgroundTime, 'ms =', totalSeconds, 'seconds');
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let formattedTime;
    if (hours > 0) {
      formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    console.log('[LIFECYCLE] Formatted time result:', formattedTime);
    return formattedTime;
  }, [backgroundTime]);
  
  // Context value
  const contextValue = {
    appState,
    backgroundTime,
    formatBackgroundTime,
    showBackgroundAlert,
    hideBackgroundAlert,
    refreshCounter,
    refreshContext,
    forceShowAlert,
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