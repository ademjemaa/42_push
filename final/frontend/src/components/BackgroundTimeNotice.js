import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppLifecycle } from '../contexts/AppLifecycleContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Main component that works in both production and dev modes
const BackgroundTimeNotice = () => {
  const { t } = useTranslation();
  const { 
    showBackgroundAlert, 
    formatBackgroundTime, 
    hideBackgroundAlert, 
    backgroundTime,
    appState,
    refreshCounter 
  } = useAppLifecycle();
  const { headerColor } = useTheme();
  
  // Local state to ensure visibility
  const [isVisible, setIsVisible] = useState(false);
  
  // Track when component mounted
  const hasMounted = useRef(false);
  
  // Component did mount
  useEffect(() => {
    console.log('[NOTICE] BackgroundTimeNotice mounted');
    hasMounted.current = true;
    
    // Set up direct AppState listener on the component itself
    const handleAppStateChange = (nextAppState) => {
      console.log(`[NOTICE] Direct AppState change: ${nextAppState}`);
      if (nextAppState === 'active') {
        // Force check visibility when coming to foreground with multiple retries
        // This handles race conditions where context updates happen after app state changes
        let retryCount = 0;
        const maxRetries = 3;
        
        const checkVisibility = () => {
          retryCount++;
          console.log(`[NOTICE] Visibility check attempt ${retryCount}/${maxRetries}`);
          
          if (showBackgroundAlert) {
            console.log('[NOTICE] Direct check: showBackgroundAlert is true, forcing visible');
            setIsVisible(true);
          } else if (retryCount < maxRetries) {
            // Retry after a delay with increasing intervals
            setTimeout(checkVisibility, 200 * retryCount);
          }
        };
        
        // Start the retry sequence
        setTimeout(checkVisibility, 200);
      }
    };
    
    // Subscribe to AppState changes
    let subscription;
    try {
      subscription = AppState.addEventListener('change', handleAppStateChange);
    } catch (error) {
      AppState.addEventListener('change', handleAppStateChange);
      subscription = {
        remove: () => AppState.removeEventListener('change', handleAppStateChange)
      };
    }
    
    return () => {
      console.log('[NOTICE] BackgroundTimeNotice unmounted');
      hasMounted.current = false;
      
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, [showBackgroundAlert]);
  
  // Update local visibility based on context
  useEffect(() => {
    console.log('[NOTICE] Context update detected, showBackgroundAlert:', showBackgroundAlert);
    
    if (hasMounted.current) {
      setIsVisible(showBackgroundAlert);
      
      // Double-check after a slight delay to ensure the state has settled
      if (showBackgroundAlert) {
        setTimeout(() => {
          setIsVisible(true);
        }, 100);
      }
    }
  }, [showBackgroundAlert, refreshCounter]);
  
  // Watch for changes in showBackgroundAlert
  useEffect(() => {
    console.log('[NOTICE] showBackgroundAlert changed to:', showBackgroundAlert);
    
    // When showBackgroundAlert becomes true, ensure visibility after a brief delay
    if (showBackgroundAlert) {
      const timer = setTimeout(() => {
        console.log('[NOTICE] Delayed force-check of visibility');
        setIsVisible(true);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [showBackgroundAlert]);
  
  // Watch for refreshCounter changes
  useEffect(() => {
    console.log('[NOTICE] refreshCounter changed to:', refreshCounter);
    
    // When refresh counter changes, check visibility state
    if (refreshCounter > 0 && showBackgroundAlert) {
      console.log('[NOTICE] RefreshCounter updated, checking visibility');
      setIsVisible(true);
    }
  }, [refreshCounter, showBackgroundAlert]);
  
  // Auto-hide the alert after 5 seconds
  useEffect(() => {
    let timer;
    if (isVisible) {
      console.log('[NOTICE] Setting auto-hide timer');
      timer = setTimeout(() => {
        console.log('[NOTICE] Auto-hiding alert');
        hideBackgroundAlert();
        setIsVisible(false);
      }, 5000);
    }
    
    return () => {
      if (timer) {
        console.log('[NOTICE] Clearing auto-hide timer');
        clearTimeout(timer);
      }
    };
  }, [isVisible, hideBackgroundAlert]);
  
  // Log renders and state
  console.log('[NOTICE] BackgroundTimeNotice rendering, showBackgroundAlert:', showBackgroundAlert, 'isVisible:', isVisible, 'refreshCounter:', refreshCounter, 'appState:', appState);
  
  // Don't render if we shouldn't show the alert
  if (!isVisible) {
    return null;
  }
  
  // Ensure we have proper values to display
  const backgroundTimeText = t('lifecycle.backgroundTime') || 'Time in background';
  
  // Format and log the background time
  let formattedTime = '0:00';
  if (formatBackgroundTime && backgroundTime) {
    formattedTime = formatBackgroundTime();
    console.log('[NOTICE] Actual background time (ms):', backgroundTime);
    console.log('[NOTICE] Formatted background time:', formattedTime);
  } else {
    console.log('[NOTICE] No background time available');
  }
  
  console.log('[NOTICE] Rendering alert with time:', formattedTime);
  
  return (
    <View 
      style={[
        styles.container, 
        { backgroundColor: headerColor || '#FF3B30' }
      ]}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.text}>
          {backgroundTimeText}: {formattedTime}
        </Text>
      </View>
      
      <TouchableOpacity 
        onPress={() => {
          console.log('[NOTICE] Close button pressed');
          hideBackgroundAlert();
          setIsVisible(false);
        }} 
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    width: SCREEN_WIDTH - 40, // 20 padding on each side
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  contentContainer: {
    flex: 1,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  closeButton: {
    padding: 5,
  }
});

export default BackgroundTimeNotice;