import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppLifecycle } from '../contexts/AppLifecycleContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const BackgroundTimeNotice = () => {
  const { t } = useTranslation();
  const { showBackgroundNotice, getFormattedBackgroundTime, clearBackgroundNotice } = useAppLifecycle();
  const { headerColor } = useTheme();
  const opacity = new Animated.Value(0);
  
  // Animation when notice should appear/disappear
  useEffect(() => {
    if (showBackgroundNotice) {
      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showBackgroundNotice]);
  
  if (!showBackgroundNotice) return null;
  
  return (
    <Animated.View style={[
      styles.container, 
      { opacity, backgroundColor: headerColor }
    ]}>
      <Text style={styles.text}>
        {t('lifecycle.backgroundTime')} {getFormattedBackgroundTime()}
      </Text>
      
      <TouchableOpacity onPress={clearBackgroundNotice} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});

export default BackgroundTimeNotice; 