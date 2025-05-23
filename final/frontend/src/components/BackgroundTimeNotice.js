import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppLifecycle } from '../contexts/AppLifecycleContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  
  const [isVisible, setIsVisible] = useState(false);
  
  const hasMounted = useRef(false);
  
  useEffect(() => {
    console.log('[NOTICE] BackgroundTimeNotice mounted');
    hasMounted.current = true;
    
    const handleAppStateChange = (nextAppState) => {
      console.log(`[NOTICE] Direct AppState change: ${nextAppState}`);
      if (nextAppState === 'active') {
        let retryCount = 0;
        const maxRetries = 3;
        
        const checkVisibility = () => {
          retryCount++;
          console.log(`[NOTICE] Visibility check attempt ${retryCount}/${maxRetries}`);
          
          if (showBackgroundAlert) {
            console.log('[NOTICE] Direct check: showBackgroundAlert is true, forcing visible');
            setIsVisible(true);
          } else if (retryCount < maxRetries) {
            setTimeout(checkVisibility, 200 * retryCount);
          }
        };
        
        setTimeout(checkVisibility, 200);
      }
    };
    
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
  
  useEffect(() => {
    console.log('[NOTICE] Context update detected, showBackgroundAlert:', showBackgroundAlert);
    
    if (hasMounted.current) {
      setIsVisible(showBackgroundAlert);
      
      if (showBackgroundAlert) {
        setTimeout(() => {
          setIsVisible(true);
        }, 100);
      }
    }
  }, [showBackgroundAlert, refreshCounter]);
  
  useEffect(() => {
    console.log('[NOTICE] showBackgroundAlert changed to:', showBackgroundAlert);
    
    if (showBackgroundAlert) {
      const timer = setTimeout(() => {
        console.log('[NOTICE] Delayed force-check of visibility');
        setIsVisible(true);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [showBackgroundAlert]);
  
  useEffect(() => {
    console.log('[NOTICE] refreshCounter changed to:', refreshCounter);
    
    if (refreshCounter > 0 && showBackgroundAlert) {
      console.log('[NOTICE] RefreshCounter updated, checking visibility');
      setIsVisible(true);
    }
  }, [refreshCounter, showBackgroundAlert]);
  
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
  
  console.log('[NOTICE] BackgroundTimeNotice rendering, showBackgroundAlert:', showBackgroundAlert, 'isVisible:', isVisible, 'refreshCounter:', refreshCounter, 'appState:', appState);
  
  if (!isVisible) {
    return null;
  }
  
  const backgroundTimeText = t('lifecycle.backgroundTime') || 'Time in background';
  
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