import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useTheme } from '../../contexts/ThemeContext';
import { useMessages } from '../../contexts/MessagesContext';
import { useAuth } from '../../contexts/AuthContext';
import { useContacts } from '../../contexts/ContactsContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import MessageBubble from '../../components/MessageBubble';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';
import { useGlobalOrientation } from '../../contexts/OrientationContext';

const ChatScreen = ({ route, navigation }) => {
  const { contactId, contactName } = route.params;
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { userId } = useAuth();
  const { contacts, getContactById } = useContacts();
  const { 
    fetchConversation, 
    sendMessage, 
    getCachedConversation,
    isLoading,
    conversations 
  } = useMessages();
  const { isPortrait } = useGlobalOrientation();
  
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [contactDetails, setContactDetails] = useState(null);
  const [contactNotFound, setContactNotFound] = useState(false);
  const isMounted = React.useRef(true);
  
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
  
  // Load contact details and debug IDs
  useEffect(() => {
    // Skip loading if we already know the contact doesn't exist
    if (contactNotFound) {
      console.log('[CHAT-DEBUG] Skipping contact info load: contact no longer exists');
      return;
    }
    
    const loadContactInfo = async () => {
      console.log('[CHAT-DEBUG] ======= CHAT INITIALIZATION =======');
      console.log('[CHAT-DEBUG] Current user ID:', userId);
      console.log('[CHAT-DEBUG] Contact ID from route params:', contactId);
      console.log('[CHAT-DEBUG] Contact name from route params:', contactName);
      
      try {
        // Get full contact details to extract the actual user_id this contact represents
        const contactInfo = await getContactById(contactId);
        
        if (!contactInfo) {
          console.log('[CHAT-DEBUG] Contact not found, redirecting to contacts list');
          setContactNotFound(true);
          return;
        }
        
        setContactDetails(contactInfo);
        console.log('[CHAT-DEBUG] Contact info loaded:', JSON.stringify(contactInfo));
        
        // Check if avatar exists and log it
        if (contactInfo.avatar) {
          console.log('[CHAT-DEBUG] Contact has avatar (length):', contactInfo.avatar.length);
        } else {
          console.log('[CHAT-DEBUG] Contact has no avatar');
        }
        
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
        
        console.log('[CHAT-DEBUG] Full contact details:', JSON.stringify(contactInfo));
        console.log('[CHAT-DEBUG] Contact record ID:', contactInfo.id);
        
        // The contact_user_id represents the actual user this contact refers to
        // This is different from user_id which is who owns this contact
        const actualUserId = contactInfo.contact_user_id;
        console.log('[CHAT-DEBUG] Contact represents actual user_id:', actualUserId);
        console.log('[CHAT-DEBUG] Contact belongs to user_id:', contactInfo.user_id);
        console.log('[CHAT-DEBUG] Contact phone number:', contactInfo.phone_number);
        
        // Find all contacts that might represent the same user
        const matchingContacts = contacts.filter(c => 
          c.phone_number === contactInfo.phone_number && c.id !== contactInfo.id
        );
        
        if (matchingContacts.length > 0) {
          console.log('[CHAT-DEBUG] Found other contacts with same phone number:', 
            matchingContacts.map(c => `ID: ${c.id}, Name: ${c.nickname || c.phone_number}`).join(', ')
          );
        }
      } catch (error) {
        // Only log as error if it's not a "contact not found" error
        if (error && error.message && error.message.toLowerCase().includes('not found')) {
          console.log('[CHAT-DEBUG] Contact was deleted, setting contactNotFound flag');
        } else {
          console.error('[CHAT-DEBUG] Error getting contact details:', error);
        }
        setContactNotFound(true);
      }
    };
    
    loadContactInfo();
  }, [contactId, userId, contacts, route.params?.updateTimestamp, contactNotFound]);
  
  // Monitor conversations context for real-time updates
  useEffect(() => {
    // For direct monitoring of the current contactId conversation
    const currentContactConversation = conversations[contactId];
    if (currentContactConversation && currentContactConversation.length > 0) {
      console.log('[CHAT] Found direct messages using contactId:', contactId);
      console.log('[CHAT] Updating messages from context, count:', currentContactConversation.length);
      setMessages(currentContactConversation);
      return;
    }
    
    // Fallback: Try to find the conversation using contact_user_id if we have contact details
    if (contactDetails && contactDetails.contact_user_id) {
      const actualUserId = contactDetails.contact_user_id.toString();
      
      // Look for any conversations that might match this actual user ID
      let updatedMessages = null;
      
      // First check if we have messages in conversations by this user's actual ID
      if (conversations[actualUserId] && conversations[actualUserId].length > 0) {
        updatedMessages = conversations[actualUserId];
        console.log('[CHAT] Found messages using actualUserId:', actualUserId);
      }
      
      if (updatedMessages && updatedMessages.length > 0) {
        console.log('[CHAT] Updating messages from context, count:', updatedMessages.length);
        setMessages(updatedMessages);
      }
    }
  }, [conversations, contactId, contactDetails]);
  
  // Load messages from API (modified to handle contact not found)
  const loadMessages = async () => {
    console.log('[CHAT] Loading messages for contact ID:', contactId);
    
    // Don't try to load messages if contact not found
    if (contactNotFound) {
      console.log('[CHAT] Contact not found, skipping message load');
      return [];
    }
    
    try {
      // First check if the contact still exists using the service
      try {
        const contactsService = require('../../services/contactsService');
        const exists = await contactsService.checkContactExists(contactId);
        
        if (!exists) {
          console.log('[CHAT] Contact no longer exists, setting contactNotFound flag');
          setContactNotFound(true);
          return [];
        }
      } catch (checkError) {
        // Don't log as error - just set contactNotFound
        console.log('[CHAT] Error checking if contact exists, assuming deleted');
        setContactNotFound(true);
        return [];
      }
      
      // First try to get cached messages for immediate display
      const cached = getCachedConversation(contactId);
      if (cached && cached.length > 0) {
        console.log('[CHAT] Using cached messages initially, count:', cached.length);
        setMessages(cached);
      } else {
        console.log('[CHAT] No cached messages found');
      }
      
      // Always fetch fresh messages from the server
      console.log('[CHAT] Fetching latest messages from API');
      
      try {
        const fetchedMessages = await fetchConversation(contactId);
        
        // Check if the component is still mounted before updating state
        if (isMounted.current) {
          console.log('[CHAT] Messages fetched successfully, count:', fetchedMessages.length);
          
          // Debug message IDs and participants
          if (fetchedMessages.length > 0) {
            const latestMsg = fetchedMessages[fetchedMessages.length - 1];
            console.log(`[CHAT-DEBUG] Latest message: ID ${latestMsg.id}, From: ${latestMsg.sender_id}, Content: "${latestMsg.content.substring(0, 20)}${latestMsg.content.length > 20 ? '...' : ''}"`);
          }
          
          // Set the messages
          setMessages(fetchedMessages);
        }
        
        return fetchedMessages;
      } catch (error) {
        // Only log as error if it's not a "contact not found" error
        if (error.message && (
            error.message.includes('Contact not found') || 
            error.message.includes('not found')
        )) {
          console.log('[CHAT] Contact was deleted, setting contactNotFound flag');
          setContactNotFound(true);
        } else {
          console.error('[CHAT] Error fetching messages:', error);
        }
        
        return []; // Return empty array instead of rethrowing
      }
    } catch (error) {
      // Only log as error if it's not a "contact not found" error
      if (error.message && error.message.toLowerCase().includes('not found')) {
        console.log('[CHAT] Contact was deleted, setting contactNotFound flag');
        setContactNotFound(true);
      } else {
        console.error('[CHAT] Error loading messages:', error);
      }
      
      return []; // Return empty array instead of rethrowing
    }
  };
  
  // Load conversation on component mount and set title
  useEffect(() => {
    console.log('[CHAT] Setting up ChatScreen for contact ID:', contactId);
    
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
    
    // Set up auto-refresh that checks if we still have a valid contact
    let refreshInterval;
    
    // Only set up auto-refresh if we have a valid contact
    if (!contactNotFound) {
      refreshInterval = setInterval(() => {
        // Skip refresh if contact is known to be deleted or component is unmounted
        if (contactNotFound || !isMounted.current) {
          console.log('[CHAT] Skipping auto-refresh: contact no longer exists or component unmounted');
          if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
          }
          return;
        }
        
        console.log('[CHAT] Auto-refreshing messages');
        
        // Use a try/catch to prevent unhandled promise rejections
        try {
          fetchConversation(contactId)
            .then(fetchedMessages => {
              if (fetchedMessages && fetchedMessages.length > 0) {
                console.log('[CHAT] Auto-refresh found', fetchedMessages.length, 'messages');
                if (isMounted.current) {
                  setMessages(fetchedMessages);
                }
              }
            })
            .catch(error => {
              console.error('[CHAT] Auto-refresh error:', error);
              // Check if the error is because contact doesn't exist
              if (error.message && error.message.includes('not found')) {
                console.log('[CHAT] Contact was deleted, setting contactNotFound flag');
                setContactNotFound(true);
                // Clean up the interval immediately
                if (refreshInterval) {
                  clearInterval(refreshInterval);
                  refreshInterval = null;
                }
              }
            });
        } catch (error) {
          console.error('[CHAT] Error in auto-refresh:', error);
        }
      }, 5000); // Refresh every 5 seconds
    }
    
    // Clean up the interval when component unmounts
    return () => {
      console.log('[CHAT] Cleaning up auto-refresh interval');
      isMounted.current = false;
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [contactId, contactNotFound]);
  
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
  const handleRefresh = async () => {
    console.log('[CHAT] Manually refreshing messages');
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };
  
  // Send a message
  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      console.log('[CHAT] Attempted to send empty message, ignoring');
      return;
    }
    
    console.log('[CHAT] Sending message to contact ID:', contactId);
    console.log('[CHAT] Message content:', messageText);
    
    if (!contactDetails) {
      console.error('[CHAT-ERROR] Cannot send message - missing contact details');
      return;
    }
    
    // Determine the correct receiver ID
    // We need the actual user_id of the recipient, not the contact record ID
    const actualRecipientId = contactDetails.contact_user_id;
    
    if (!actualRecipientId) {
      console.error('[CHAT-ERROR] Cannot send message - contact is not linked to a real user ID');
      Alert.alert(t('messages.cannotSend'), t('messages.noRegisteredUser'));
      return;
    }
    
    // Debug: Log the actual user ID we're sending to
    console.log('[CHAT-DEBUG] Sending message to contact_id:', contactId);
    console.log('[CHAT-DEBUG] This contact represents actual user_id:', actualRecipientId);
    
    // Store current message text and clear the input
    const currentMessage = messageText;
    setMessageText('');
    
    // Add optimistic message to the UI immediately
    const tempMessage = {
      id: `temp-${Date.now()}`,
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
      console.log('[CHAT-DEBUG] Using recipient user ID for message:', actualRecipientId);
      
      const result = await sendMessage(actualRecipientId, currentMessage);
      console.log('[CHAT] Message sent successfully, result:', JSON.stringify(result));
      
      // Update the temp message with the real message ID
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...result, sending: false } 
            : msg
        )
      );
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
      
      Alert.alert(t('messages.messageFailed'), t('messages.messageSavedAsDraft'));
    }
  };
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateString = date.toDateString();
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(message);
    });
    
    // Convert to array for FlatList
    const result = [];
    
    Object.keys(groups).forEach(date => {
      result.push({
        type: 'date',
        date,
      });
      
      groups[date].forEach(message => {
        result.push({
          type: 'message',
          ...message,
        });
      });
    });
    
    return result;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    
    if (dateString === today) {
      return t('messages.today');
    } else if (dateString === yesterdayString) {
      return t('messages.yesterday');
    } else {
      return new Date(dateString).toLocaleDateString();
    }
  };
  
  // Render item for FlatList
  const renderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
      );
    } else {
      const isOwn = item.sender_id.toString() === userId;
      return <MessageBubble message={item} isOwn={isOwn} />;
    }
  };
  
  // A cleaner approach for refreshing data
  useEffect(() => {
    // Set isMounted flag to true when component mounts
    isMounted.current = true;
    
    // Only refresh if contact isn't deleted
    if (contactNotFound) {
      console.log('[CHAT] Skipping data refresh: contact no longer exists');
      return;
    }
    
    // Only one place handles data refreshing
    const refreshData = async () => {
      if (!isMounted.current) return;
      
      // Skip refresh if contact is known to be deleted
      if (contactNotFound) {
        console.log('[CHAT] Skipping data refresh: contact no longer exists');
        return;
      }
      
      try {
        await loadMessages();
      } catch (error) {
        console.error('[CHAT] Refresh error:', error);
        // Check if the error is because contact doesn't exist
        if (error.message && error.message.includes('not found')) {
          console.log('[CHAT] Contact was deleted, setting contactNotFound flag');
          setContactNotFound(true);
        }
      }
    };

    // Initial load
    refreshData();
    
    // Set up refresh triggers
    let interval;
    let focusUnsubscribe;
    let appStateSubscription;
    
    if (!contactNotFound) {
      // Only set up listeners if contact exists
      interval = setInterval(() => {
        if (isMounted.current && !contactNotFound) {
          refreshData();
        } else if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }, 20000);
      
      focusUnsubscribe = navigation.addListener('focus', () => {
        if (isMounted.current && !contactNotFound) refreshData();
      });
      
      appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active' && isMounted.current && !contactNotFound) refreshData();
      });
    }
    
    return () => {
      // Mark component as unmounted
      isMounted.current = false;
      if (interval) clearInterval(interval);
      if (focusUnsubscribe) focusUnsubscribe();
      if (appStateSubscription) appStateSubscription.remove();
    };
  }, [navigation, contactNotFound]); // Add contactNotFound to dependencies
  
  // If contact details are still loading, show spinner
  if (!contactDetails && !contactNotFound) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={headerColor} />
        </View>
      </SafeAreaView>
    );
  }
  
  // If contact not found, show loading spinner while silently navigating away
  if (contactNotFound) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={headerColor} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
      >
        {isLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={headerColor} />
          </View>
        ) : (
          <FlatList
            data={groupMessagesByDate()}
            keyExtractor={(item, index) => 
              item.type === 'date' ? item.date : item.id.toString()
            }
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('messages.noMessages')}</Text>
              </View>
            }
          />
        )}
        
        <View style={styles.inputContainer}>
          {contactDetails?.is_blocked ? (
            <View style={styles.blockedContainer}>
              <Ionicons name="lock-closed" size={24} color="#FF3B30" style={styles.blockedIcon} />
              <Text style={styles.blockedText}>{t('messages.contactBlocked')}</Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={messageText}
                onChangeText={setMessageText}
                placeholder={t('messages.typeMessage')}
                multiline={!isPortrait}
                numberOfLines={1}
                maxHeight={isPortrait ? 40 : 100}
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: headerColor }]}
                onPress={handleSendMessage}
                disabled={!messageText.trim()}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </>
          )}
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
});

export default ChatScreen; 