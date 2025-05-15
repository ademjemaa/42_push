import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

export const useOrientation = () => {
  const { width, height } = useWindowDimensions();
  const [orientation, setOrientation] = useState(
    width > height ? 'landscape' : 'portrait'
  );

  useEffect(() => {
    // Update orientation when dimensions change
    setOrientation(width > height ? 'landscape' : 'portrait');
  }, [width, height]);

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    width,
    height
  };
}; 