import React, { useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

const ContactListItem = memo(({ contact, onPress }) => {
  const { t } = useTranslation();
  const lastMessageRef = useRef(contact.lastMessage?.id);
  
  const isRecent = () => {
    if (!contact.lastMessage) return false;
    
    const messageTime = new Date(contact.lastMessage.timestamp);
    const now = new Date();
    const diffMs = now - messageTime;
    
    return diffMs < 30000; // 30 seconds
  };
  
  useEffect(() => {
    lastMessageRef.current = contact.lastMessage?.id;
  }, [contact.lastMessage?.id]);
  
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) {
      return t('messages.now');
    }
    
    if (diffMinutes < 60) {
      return t('messages.minute', { count: diffMinutes });
    }
    
    if (diffHours < 24) {
      return t('messages.hour', { count: diffHours });
    }
    
    if (diffDays < 7) {
      return t('messages.day', { count: diffDays });
    }
    
    const month = String(messageDate.getMonth() + 1).padStart(2, '0');
    const day = String(messageDate.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };
  
  const displayName = contact.nickname || contact.phone_number;
  
  const lastMessageSnippet = contact.lastMessage 
    ? contact.lastMessage.content
    : '';

  const hasMessages = !!contact.lastMessage;
  
  const isFromContact = hasMessages && 
    contact.lastMessage.sender_id !== contact.user_id &&
    contact.lastMessage.sender_id === contact.contact_user_id;
  
  const shouldHighlight = isRecent() && isFromContact;
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        shouldHighlight && styles.highlightContainer
      ]} 
      onPress={() => onPress(contact)}
      activeOpacity={0.7}
    >
      <Avatar 
        imageUri={contact.avatar ? `data:image/jpeg;base64,${contact.avatar}` : null}
        userAvatar={contact.user_avatar}
        name={displayName}
        size={50}
      />
      
      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <Text style={[
            styles.name,
            shouldHighlight && styles.highlightText
          ]} numberOfLines={1}>
            {displayName}
          </Text>
          
          {contact.lastMessage && (
            <Text style={[
              styles.time,
              shouldHighlight && styles.highlightTime
            ]}>
              {formatLastMessageTime(contact.lastMessage.timestamp)}
            </Text>
          )}
        </View>
        
        <View style={styles.bottomRow}>
          {hasMessages ? (
            <View style={styles.messageContainer}>
              {shouldHighlight && (
                <View style={styles.newIndicator} />
              )}
              <Text 
                style={[
                  styles.message,
                  shouldHighlight && styles.highlightText
                ]} 
                numberOfLines={1}
              >
                {lastMessageSnippet}
              </Text>
            </View>
          ) : (
            <Text style={styles.noMessage} numberOfLines={1}>
              {t('messages.noMessages')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  highlightContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  contentContainer: {
    marginLeft: 12,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#999',
    minWidth: 30,
    textAlign: 'right',
  },
  highlightTime: {
    color: '#007AFF',
    fontWeight: '500',
  },
  highlightText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#777',
    flex: 1,
  },
  noMessage: {
    fontSize: 14,
    color: '#AAAAAA',
    fontStyle: 'italic',
    flex: 1,
  },
  newIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    marginRight: 5,
  },
  typingText: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  }
});

export default ContactListItem; 