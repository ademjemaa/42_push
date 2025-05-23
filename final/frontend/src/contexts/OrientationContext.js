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
  const [orientation, setOrientation] = useState(
    width > height ? 'landscape' : 'portrait'
  );
  
  const widthShared = useSharedValue(width);
  const heightShared = useSharedValue(height);

  useEffect(() => {
    setOrientation(width > height ? 'landscape' : 'portrait');
    widthShared.value = width;
    heightShared.value = height;
  }, [width, height]);
  
  const orientationData = {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    width,
    height,
    widthShared,
    heightShared,
    screenRatio: width / height,
    deviceAspectRatio: Math.max(width, height) / Math.min(width, height),
    screenSize: Math.sqrt(width * width + height * height),
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