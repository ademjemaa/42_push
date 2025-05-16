import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_HEADER_COLOR = '#2196F3'; // Default blue

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [headerColor, setHeaderColor] = useState(DEFAULT_HEADER_COLOR);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  const updateHeaderColor = async (color) => {
    try {
      setHeaderColor(color);
      
      await AsyncStorage.setItem('headerColor', color);
    } catch (e) {
      console.error('Failed to save header color to storage', e);
      throw e;
    }
  };
  
  const resetHeaderColor = async () => {
    try {
      setHeaderColor(DEFAULT_HEADER_COLOR);
      
      await AsyncStorage.removeItem('headerColor');
    } catch (e) {
      console.error('Failed to reset header color', e);
      throw e;
    }
  };
  
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

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}; 