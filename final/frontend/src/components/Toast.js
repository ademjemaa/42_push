import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const Toast = ({ visible, message, type = 'info', duration = 3000, onHide }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(-20));

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Hide after duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onHide) onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, fadeAnim, translateY, duration, onHide]);

  if (!visible) return null;

  // Choose icon based on type
  let iconName = 'information-circle';
  let backgroundColor = '#2196F3';

  if (type === 'success') {
    iconName = 'checkmark-circle';
    backgroundColor = '#4CAF50';
  } else if (type === 'warning') {
    iconName = 'warning';
    backgroundColor = '#FFC107';
  } else if (type === 'error') {
    iconName = 'alert-circle';
    backgroundColor = '#F44336';
  } else if (type === 'time') {
    iconName = 'time';
    backgroundColor = '#9C27B0';
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor, opacity: fadeAnim, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={iconName} size={24} color="white" style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    width: width - 40,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9999,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});

export default Toast; 