import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  BackHandler,
  AppState
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import MessageBubble from '../../components/MessageBubble';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';
import { useGlobalOrientation } from '../../contexts/OrientationContext';
import contactsService from '../../services/contactsService';
import {
  fetchConversation as fetchConversationAction,
  sendMessage,
  selectConversation,
  selectMessagesStatus,
  selectMessagesError,
  markAsReadAction
} from '../../redux/slices/messagesSlice';
import {
  getContactById as getContactByIdAction,
  selectContactById
} from '../../redux/slices/contactsSlice';

const ChatScreen = ({ route, navigation }) => {
  const { contactId, contactName } = route.params;
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { userId } = useAuth();
  const { isPortrait } = useGlobalOrientation();
  const dispatch = useDispatch();
  
  // Redux selectors at the top level
  const isLoading = useSelector(state => selectMessagesStatus(state) === 'loading');
  const error = useSelector(selectMessagesError);
  const currentConversation = useSelector(state => selectConversation(state, contactId));
  
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [contactDetails, setContactDetails] = useState(null);
  const [contactNotFound, setContactNotFound] = useState(false);
  const isMounted = React.useRef(true);
  const messagesMarkedAsRead = React.useRef(false);
  
  // Track last load time to prevent excessive API calls
  const lastLoadTime = useRef(0);
  
  // Handle navigation away from deleted contacts
  useEffect(() => {
    let redirectTimer;
    
    if (contactNotFound) {
      // Navigate away after a short delay without showing an alert
      redirectTimer = setTimeout(() => {
        navigation.navigate('Main', { screen: 'Contacts' });
      }, 300);
    }
    
    // Cleanup function
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [contactNotFound, navigation]);
  
  // Load contact details
  useEffect(() => {
    // Skip loading if we already know the contact doesn't exist
    if (contactNotFound) {
      return;
    }
    
    const loadContactInfo = async () => {
      try {
        // Get full contact details using Redux action
        const contactInfo = await dispatch(getContactByIdAction(contactId)).unwrap();
        
        if (!contactInfo) {
          console.log('[CHAT] Contact not found, redirecting to contacts list');
          setContactNotFound(true);
          return;
        }
        
        setContactDetails(contactInfo);
        
        // Update navigation options with latest contact info
        navigation.setOptions({
          headerTitle: () => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('EditContact', { contactId, returnToChat: true })}
              style={styles.headerTitle}
            >
              <View style={styles.headerContent}>
                <Avatar
                  imageUri={contactInfo.avatar ? `data:image/jpeg;base64,${contactInfo.avatar}` : null}
                  userAvatar={contactInfo.user_avatar}
                  name={contactInfo.nickname || contactInfo.phone_number}
                  size={32}
                />
                <Text style={styles.headerText} numberOfLines={1}>
                  {contactInfo.nickname || contactInfo.phone_number}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="white" />
              </View>
            </TouchableOpacity>
          ),
        });
      } catch (error) {
        if (error && error.message && error.message.toLowerCase().includes('not found')) {
          console.log('[CHAT] Contact was deleted, setting contactNotFound flag');
        } else {
          console.error('[CHAT] Error getting contact details:', error);
        }
        setContactNotFound(true);
      }
    };
    
    loadContactInfo();
  }, [contactId, userId, route.params?.updateTimestamp, contactNotFound, dispatch]);
  
  // Memoize the fallback conversation to avoid creating new references
  const fallbackConversation = useMemo(() => {
    if (!contactDetails || !contactDetails.contact_user_id) return null;
    
    // This will only be computed when contactDetails changes
    const actualUserId = contactDetails.contact_user_id.toString();
    return actualUserId;
  }, [contactDetails]);
  
  // Separate selector for fallback conversation
  const fallbackMessages = useSelector(state => 
    fallbackConversation ? selectConversation(state, fallbackConversation) : []
  );
  
  // Update messages when conversations change
  useEffect(() => {
    if (currentConversation && currentConversation.length > 0) {
      // Sort messages by timestamp in descending order for the inverted FlatList
      const sortedMessages = [...currentConversation].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      setMessages(sortedMessages);
    } else if (fallbackMessages && fallbackMessages.length > 0) {
      // Sort messages by timestamp in descending order for the inverted FlatList
      const sortedMessages = [...fallbackMessages].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      setMessages(sortedMessages);
    }
  }, [currentConversation, fallbackMessages]);
  
  // Load messages from API
  const loadMessages = useCallback(async () => {
    // Don't try to load messages if contact not found
    if (contactNotFound) {
      return [];
    }
    
    // Prevent too frequent API calls (minimum 2 seconds between loads)
    const now = Date.now();
    if (now - lastLoadTime.current < 2000) {
      console.log('[CHAT] Skipping load, too soon since last load');
      return;
    }
    
    lastLoadTime.current = now;
    
    try {
      // First check if the contact still exists
      try {
        const exists = await contactsService.checkContactExists(contactId);
        
        if (!exists) {
          setContactNotFound(true);
          return [];
        }
      } catch (checkError) {
        setContactNotFound(true);
        return [];
      }
      
      // Fetch fresh messages from the server via Redux action
      await dispatch(fetchConversationAction(contactId)).unwrap();
      
      // Don't need to set messages here as useEffect will handle it when Redux state updates
      return true;
    } catch (error) {
      if (error.message && (
          error.message.includes('Contact not found') || 
          error.message.includes('not found')
      )) {
        setContactNotFound(true);
      } else {
        console.error('[CHAT] Error fetching messages:', error);
      }
      
      return false;
    }
  }, [contactId, contactNotFound, dispatch]);
  
  // Load conversation on component mount and set title
  useEffect(() => {
    // Setup header immediately with basic info and custom back button
    navigation.setOptions({
      title: contactName,
      headerTitle: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('EditContact', { contactId, returnToChat: true })}
          style={styles.headerTitle}
        >
          <Text style={styles.headerText} numberOfLines={1}>{contactName}</Text>
          <Ionicons name="chevron-forward" size={16} color="white" />
        </TouchableOpacity>
      ),
      // Custom back button to go directly to Contacts tab
      headerLeft: () => (
        <TouchableOpacity 
          style={{ marginLeft: 10 }}
          onPress={() => navigation.navigate('Main', { screen: 'Contacts' })}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      ),
    });
    
    // Only attempt initial load if we don't already know the contact is deleted
    if (!contactNotFound) {
      // Initial load
      loadMessages();
    }
    
    // Clean up when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, [contactId, contactNotFound, contactName, navigation, loadMessages]);
  
  // Screen focus effect to refresh messages
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Only load if mounted and contact exists
      if (isMounted.current && !contactNotFound) {
        // Use the same throttling here
        const now = Date.now();
        if (now - lastLoadTime.current >= 2000) {
          console.log('[CHAT] Screen focused, loading messages');
        loadMessages();
        } else {
          console.log('[CHAT] Screen focused, but skipping load (too soon)');
        }
      }
    });
    
    return unsubscribe;
  }, [navigation, contactNotFound, loadMessages]);
  
  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Navigate to Contacts tab instead of default back behavior
      navigation.navigate('Main', { screen: 'Contacts' });
      return true; // Prevent default back action
    });
    
    return () => backHandler.remove();
  }, [navigation]);
  
  // Refresh messages
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [loadMessages]);
  
  // Send a message
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) {
      return;
    }
    
    if (!contactDetails) {
      console.error('[CHAT] Cannot send message - missing contact details');
      return;
    }
    
    // Determine the correct receiver ID
    // We need the actual user_id of the recipient, not the contact record ID
    const actualRecipientId = contactDetails.contact_user_id;
    
    if (!actualRecipientId) {
      console.error('[CHAT] Cannot send message - contact is not linked to a real user ID');
      Alert.alert(t('messages.cannotSend'), t('messages.noRegisteredUser'));
      return;
    }
    
    // Store current message text and clear the input
    const currentMessage = messageText;
    setMessageText('');
    
    // Add optimistic message to the UI immediately
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      sender_id: userId,
      receiver_id: actualRecipientId,
      content: currentMessage,
      timestamp: new Date().toISOString(),
      is_read: true,
      sending: true // Indicate message is being sent
    };
    
    // Update local messages state for immediate feedback
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      // Use socket middleware to send message
      dispatch({ 
        type: 'socket/sendMessage', 
        payload: { 
          receiverId: actualRecipientId, 
          content: currentMessage,
          contactId: contactId,
          tempId // Pass the temp ID to help with mapping in the reducer
        } 
      });
      
      // The socket middleware will handle the rest and update Redux state
    } catch (error) {
      console.error('[CHAT] Failed to send message:', error);
      
      // Mark the message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, sending: false, delivery_failed: true, error_message: error.message } 
            : msg
        )
      );
      
      // Show error to user
      Alert.alert(
        t('messages.failed'),
        error.message || t('messages.genericError')
      );
    }
  }, [messageText, contactDetails, userId, dispatch, t, contactId]);
  
  // Group messages by date
  const groupMessagesByDate = useCallback((messagesToGroup) => {
    const grouped = {};
    
    messagesToGroup.forEach(message => {
      const date = new Date(message.timestamp);
      const dateStr = formatDate(message.timestamp);
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      
      grouped[dateStr].push(message);
    });
    
    // Convert to array for FlatList
    return Object.keys(grouped).map(date => ({
      title: date,
      data: grouped[date],
    }));
  }, []);
  
  // Format date for section headers
  const formatDate = useCallback((dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      return t('messages.today');
    }
    
    const isYesterday = date.getDate() === now.getDate() - 1 &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    
    if (isYesterday) {
      return t('messages.yesterday');
    }
    
    return date.toLocaleDateString();
  }, [t]);
  
  // Group messages by date for section headers
  const groupedMessages = useMemo(() => {
    return groupMessagesByDate(messages);
  }, [messages, groupMessagesByDate]);
  
  // Render a message item
  const renderItem = useCallback(({ item }) => {
    // Check if item is valid before trying to render it
    if (!item || typeof item !== 'object') {
      console.warn('[CHAT] Invalid message item:', item);
      return null;
    }
    
    // Map message data to correct format if needed
    const safeItem = {
      ...item,
      // Ensure required fields exist
      id: item.id || `temp-${Date.now()}`,
      content: item.content || '',
      timestamp: item.timestamp || new Date().toISOString()
    };
    
    return (
      <MessageBubble
        item={safeItem}
        userId={userId}
        contactDetails={contactDetails}
      />
    );
  }, [userId, contactDetails]);
  
  // Key extractor for FlatList
  const keyExtractor = useCallback((item) => item.id.toString(), []);
  
  // Reset messagesMarkedAsRead when contactId changes
  useEffect(() => {
    messagesMarkedAsRead.current = false;
  }, [contactId]);
  
  // Reset messagesMarkedAsRead when messages change
  useEffect(() => {
    messagesMarkedAsRead.current = false;
  }, [messages.length]);
  
  // Show loading indicator
  if (isLoading && messages.length === 0 && !contactNotFound) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={headerColor} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.contentContainer}>
          {messages.length === 0 && !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('messages.noMessages')}</Text>
              <Text style={styles.startChatText}>{t('messages.startChatting')}</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.messageList}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              inverted
              removeClippedSubviews={true}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={10}
              onScroll={() => {
                // Avoid calling this too frequently
                if (contactId && !contactNotFound && messages.length > 0) {
                  // Use a ref to track if we've already marked as read
                  if (!messagesMarkedAsRead.current) {
                  dispatch(markAsReadAction(contactId));
                    messagesMarkedAsRead.current = true;
                  }
                }
              }}
              onScrollBeginDrag={() => {
                // We don't need to mark as read on both scroll events
                // This one can be safely removed
              }}
            />
          )}
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t('messages.typeMessage')}
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: headerColor }]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    backgroundColor: '#F0F0F0',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    alignSelf: 'flex-end',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
  },
  headerText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  blockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  blockedIcon: {
    marginRight: 10,
  },
  blockedText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  startChatText: {
    color: 'gray',
    textAlign: 'center',
    marginTop: 20,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 0,
  },
});

export default ChatScreen; 