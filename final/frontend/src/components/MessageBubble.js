import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useMessages } from '../contexts/MessagesContext';

const MessageBubble = ({ message, isOwn }) => {
  const { headerColor } = useTheme();
  const { sendMessage } = useMessages();
  
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle retry for failed messages
  const handleRetry = async () => {
    if (!message.receiver_id || !message.content) return;
    
    try {
      await sendMessage(message.receiver_id, message.content);
      // The message will be automatically updated through the MessagesContext
    } catch (error) {
      console.error('[MESSAGE-BUBBLE] Failed to retry sending message:', error);
    }
  };
  
  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownContainer : styles.otherContainer
    ]}>
      <View style={[
        styles.bubble,
        isOwn ? [styles.ownBubble, { backgroundColor: headerColor }] : styles.otherBubble,
        message.delivery_failed && styles.failedBubble
      ]}>
        <Text style={[
          styles.text,
          isOwn ? styles.ownText : styles.otherText
        ]}>
          {message.content}
        </Text>
        <View style={styles.footerRow}>
          {message.sending && (
            <View style={styles.sendingContainer}>
              <ActivityIndicator size="small" color={isOwn ? "white" : headerColor} />
              <Text style={[
                styles.statusText,
                isOwn ? styles.ownStatusText : styles.otherStatusText
              ]}>
                Sending...
              </Text>
            </View>
          )}
          
          {message.delivery_failed && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
              <Text style={styles.errorText}>
                Failed to send
              </Text>
              {isOwn && (
                <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <Text style={[
            styles.timestamp,
            isOwn ? styles.ownTimestamp : styles.otherTimestamp
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    minWidth: 80,
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  failedBubble: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  text: {
    fontSize: 16,
    marginBottom: 4,
  },
  ownText: {
    color: 'white',
  },
  otherText: {
    color: 'black',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    marginLeft: 4,
  },
  ownStatusText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherStatusText: {
    color: 'gray',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#FF3B30',
    marginLeft: 2,
  },
  retryButton: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
  },
  retryText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 11,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: 'gray',
  },
});

export default MessageBubble; 