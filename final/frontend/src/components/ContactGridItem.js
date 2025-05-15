import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGlobalOrientation } from '../contexts/OrientationContext';
import Avatar from './Avatar';

const ContactGridItem = ({ contact, onPress, headerColor }) => {
  const { t } = useTranslation();
  const { isPortrait, width } = useGlobalOrientation();
  
  // Calculate item size based on screen width and number of columns
  const numColumns = isPortrait ? 2 : 3;
  
  // Account for all margins and padding to prevent clipping
  // Total horizontal spacing: container padding (16px each side) + 
  // grid container padding (8px each side) + item margin (8px each side) * numColumns
  const totalHorizontalPadding = 16 + 16 + (16 * numColumns);
  const availableWidth = width - totalHorizontalPadding;
  const itemSize = availableWidth / numColumns;
  
  // Get display name (nickname or phone number)
  const displayName = contact.nickname || contact.phone_number;
  
  // Check if contact has recent messages
  const hasMessages = contact.lastMessage !== undefined && contact.lastMessage !== null;
  
  // Format timestamp for last message
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Within a minute
    if (diffMinutes < 1) {
      return t('messages.now');
    }
    
    // Within an hour
    if (diffMinutes < 60) {
      return t('messages.minute', { count: diffMinutes });
    }
    
    // Within a day
    if (diffHours < 24) {
      return t('messages.hour', { count: diffHours });
    }
    
    // Within a week
    if (diffDays < 7) {
      return t('messages.day', { count: diffDays });
    }
    
    // More than a week - show MM/DD format
    const month = String(messageDate.getMonth() + 1).padStart(2, '0');
    const day = String(messageDate.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { width: itemSize, height: itemSize + 40 }
      ]} 
      onPress={() => onPress(contact)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Avatar 
          imageUri={contact.avatar ? `data:image/jpeg;base64,${contact.avatar}` : null}
          userAvatar={contact.user_avatar}
          name={displayName}
          size={Math.min(itemSize * 0.6, 70)}
        />
      </View>
      
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {displayName}
      </Text>
      
      {hasMessages ? (
        <View style={styles.messageContainer}>
          <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
            {contact.lastMessage.content.substring(0, 20)}
            {contact.lastMessage.content.length > 20 ? '...' : ''}
          </Text>
          <Text style={styles.timestamp}>
            {formatLastMessageTime(contact.lastMessage.timestamp)}
          </Text>
        </View>
      ) : (
        <Text style={styles.noMessages}>
          {t('messages.noMessages')}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  avatarContainer: {
    marginBottom: 12,
    padding: 3,
    borderRadius: 100,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
    paddingHorizontal: 4,
  },
  messageContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 12,
    color: 'gray',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  noMessages: {
    fontSize: 12,
    color: '#AAAAAA',
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 4,
  }
});

export default ContactGridItem; 