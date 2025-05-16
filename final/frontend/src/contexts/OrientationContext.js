import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

// Create the context
export const OrientationContext = createContext();

/**
 * OrientationProvider - Provides orientation information to the entire app
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
export const OrientationProvider = ({ children }) => {
  const { width, height } = useWindowDimensions();
  // Use plain state for orientation string
  const [orientation, setOrientation] = useState(
    width > height ? 'landscape' : 'portrait'
  );
  
  // Shared values for animations - these should be used directly in animated styles
  const widthShared = useSharedValue(width);
  const heightShared = useSharedValue(height);

  // Update orientation when dimensions change
  useEffect(() => {
    setOrientation(width > height ? 'landscape' : 'portrait');
    // Update shared values
    widthShared.value = width;
    heightShared.value = height;
  }, [width, height]);
  
  // Values to be provided by the context
  const orientationData = {
    // Basic orientation info
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    // Regular values for non-animated components
    width,
    height,
    // Shared values for animations
    widthShared,
    heightShared,
    // Add some useful derived values
    screenRatio: width / height,
    deviceAspectRatio: Math.max(width, height) / Math.min(width, height),
    screenSize: Math.sqrt(width * width + height * height),
    // Helpers for responsive sizing
    getResponsiveSize: (portraitSize, landscapeSize) => 
      orientation === 'portrait' ? portraitSize : landscapeSize,
    getWidthPercentage: (percentage) => (width * percentage) / 100,
    getHeightPercentage: (percentage) => (height * percentage) / 100
  };

  return (
    <OrientationContext.Provider value={orientationData}>
      {children}
    </OrientationContext.Provider>
  );
};

/**
 * useGlobalOrientation - Custom hook to access orientation data across the app
 * 
 * @returns {Object} Orientation data: 
 *  - orientation: 'portrait' | 'landscape'
 *  - isPortrait: boolean
 *  - isLandscape: boolean
 *  - width: number (regular value)
 *  - height: number (regular value)
 *  - widthShared: Animated.SharedValue (for animations)
 *  - heightShared: Animated.SharedValue (for animations)
 *  - screenRatio: width / height
 *  - deviceAspectRatio: number
 *  - screenSize: diagonal size in pixels
 *  - getResponsiveSize: function(portraitSize, landscapeSize)
 *  - getWidthPercentage: function(percentage)
 *  - getHeightPercentage: function(percentage)
 */
export const useGlobalOrientation = () => {
  const context = useContext(OrientationContext);
  
  if (!context) {
    throw new Error('useGlobalOrientation must be used within an OrientationProvider');
  }
  
  return context;
}; 