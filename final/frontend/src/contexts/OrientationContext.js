import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

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

  // Update orientation when dimensions change
  useEffect(() => {
    setOrientation(width > height ? 'landscape' : 'portrait');
  }, [width, height]);
  
  // Values to be provided by the context
  const orientationData = {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    width,
    height,
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
 *  - width: number
 *  - height: number
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