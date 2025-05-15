import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const Avatar = ({ 
  imageUri, 
  name, 
  size = 50, 
  onPress,
  userAvatar = null,
  defaultImage = require('../../assets/images/default-avatar.png')
}) => {
  const { headerColor } = useTheme();
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const [imageError, setImageError] = useState(false);
  
  // Determine which avatar URI to use (prioritize user avatar if available)
  // Make sure both userAvatar and imageUri are non-null/undefined before using them
  const avatarUri = userAvatar && typeof userAvatar === 'string'
    ? `data:image/jpeg;base64,${userAvatar}` 
    : (imageUri && typeof imageUri === 'string') ? imageUri : null;
  
  // Reset image error when avatarUri changes
  useEffect(() => {
    setImageError(false);
  }, [avatarUri]);
  
  // Log avatar props for debugging only in development (reduced logging)
  useEffect(() => {
    if (__DEV__ && false) { // Setting to false to disable even in dev mode
      console.log('[AVATAR-DEBUG] Avatar component rendering:');
      console.log('[AVATAR-DEBUG] - name:', name);
      console.log('[AVATAR-DEBUG] - size:', size);
      console.log('[AVATAR-DEBUG] - has avatar:', !!avatarUri);
    }
  }, [name, size, avatarUri]);
  
  // Style the avatar based on size
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: !avatarUri || imageError ? headerColor : 'transparent',
  };
  
  const textStyle = {
    fontSize: size * 0.4,
  };
  
  const renderContent = () => {
    if (avatarUri && !imageError) {
      return (
        <Image 
          source={{ uri: avatarUri }} 
          style={styles.image} 
          defaultSource={defaultImage}
          onError={() => {
            // Silently handle image errors without logging
            setImageError(true);
          }}
        />
      );
    }
    
    return (
      <Text style={[styles.initial, textStyle]}>{initial}</Text>
    );
  };
  
  // If onPress is provided, make it touchable
  if (onPress) {
    return (
      <TouchableOpacity 
        style={[styles.container, containerStyle]} 
        onPress={onPress}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }
  
  // Otherwise, just a view
  return (
    <View style={[styles.container, containerStyle]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  initial: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Avatar; 