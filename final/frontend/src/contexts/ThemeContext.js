import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default header color
const DEFAULT_HEADER_COLOR = '#2196F3'; // Default blue

// Create Theme Context
export const ThemeContext = createContext();

// Theme Context Provider
export const ThemeProvider = ({ children }) => {
  const [headerColor, setHeaderColor] = useState(DEFAULT_HEADER_COLOR);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load header color from storage on app start
  useEffect(() => {
    const loadHeaderColor = async () => {
      try {
        const storedColor = await AsyncStorage.getItem('headerColor');
        if (storedColor) {
          setHeaderColor(storedColor);
        }
      } catch (e) {
        console.error('Failed to load header color from storage', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHeaderColor();
  }, []);
  
  // Update header color
  const updateHeaderColor = async (color) => {
    try {
      // Update state
      setHeaderColor(color);
      
      // Save to storage
      await AsyncStorage.setItem('headerColor', color);
    } catch (e) {
      console.error('Failed to save header color to storage', e);
      throw e;
    }
  };
  
  // Reset to default color
  const resetHeaderColor = async () => {
    try {
      // Reset to default
      setHeaderColor(DEFAULT_HEADER_COLOR);
      
      // Remove from storage
      await AsyncStorage.removeItem('headerColor');
    } catch (e) {
      console.error('Failed to reset header color', e);
      throw e;
    }
  };
  
  // Available color options
  const colorOptions = [
    { name: 'Blue', value: '#2196F3' },
    { name: 'Red', value: '#F44336' },
    { name: 'Green', value: '#4CAF50' },
    { name: 'Purple', value: '#9C27B0' },
    { name: 'Orange', value: '#FF9800' },
    { name: 'Teal', value: '#009688' },
    { name: 'Pink', value: '#E91E63' },
    { name: 'Indigo', value: '#3F51B5' },
  ];
  
  // Theme context value
  const themeContext = {
    headerColor,
    updateHeaderColor,
    resetHeaderColor,
    colorOptions,
    isLoading
  };
  
  return (
    <ThemeContext.Provider value={themeContext}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme Context Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}; 