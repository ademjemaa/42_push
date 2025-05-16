import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

export const useOrientation = () => {
  const { width, height } = useWindowDimensions();
  const [orientation, setOrientation] = useState(
    width > height ? 'landscape' : 'portrait'
  );
  
  // Add shared values for use with Reanimated
  const widthShared = useSharedValue(width);
  const heightShared = useSharedValue(height);

  useEffect(() => {
    // Update orientation when dimensions change
    setOrientation(width > height ? 'landscape' : 'portrait');
    
    // Also update shared values
    widthShared.value = width;
    heightShared.value = height;
  }, [width, height]);

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    // Regular values for normal styling
    width,
    height,
    // Shared values for animations
    widthShared,
    heightShared
  };
}; 