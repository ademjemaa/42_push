import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

export const useOrientation = () => {
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

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    width,
    height,
    widthShared,
    heightShared
  };
}; 