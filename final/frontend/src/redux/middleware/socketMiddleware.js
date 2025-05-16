import { getSocket, initSocket } from '../../services/api';
import { MESSAGE_TYPES } from '../constants/messageTypes';
import { messageReceived, messageDelivered, messageRead } from '../slices/messagesSlice';
import { contactAdded, contactUpdated, contactDeleted, updateContactLastMessage, fetchContacts } from '../slices/contactsSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppState } from 'react-native';

// Map to track message timeouts by tempId (at module level)
const messageTimeouts = {};
console.log('[SOCKET-MIDDLEWARE] Initialized module-level messageTimeouts map');

// Socket middleware
const socketMiddleware = store => {
  let socket = null;
  
  return next => action => {
    // Handle socket connection/disconnection actions
    if (action.type === 'socket/connect') {
      // Get user ID from payload
      const userId = action.payload;
      if (userId) {
        // Initialize socket connection
        initSocket(userId).then(socketInstance => {
          if (socketInstance) {
            socket = socketInstance;
            setupSocketListeners(socket, store);
            console.log('[SOCKET-MIDDLEWARE] Socket connected and listeners set up');
          } else {
            console.error('[SOCKET-MIDDLEWARE] Failed to initialize socket');
          }
        });
      } else {
        console.error('[SOCKET-MIDDLEWARE] Cannot connect socket: No user ID provided');
      }
    }
    
    if (action.type === 'socket/disconnect') {
      if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[SOCKET-MIDDLEWARE] Socket disconnected');
      }
    }
    
    // Handle socket message sending
    if (action.type === 'socket/sendMessage') {
      const { receiverId, content, contactId, tempId } = action.payload;
      
      if (socket && socket.connected) {
        // Get current user ID
        AsyncStorage.getItem('userId').then(senderId => {
          if (!senderId) {
            console.error('[SOCKET-MIDDLEWARE] Cannot send message: No sender ID found');
            return;
          }
          
          const timestamp = new Date().toISOString();
          const messageData = {
            type: MESSAGE_TYPES.PRIVATE_MESSAGE,
            payload: {
              senderId,
              receiverId,
              content,
              timestamp,
              tempId // Pass the tempId to the backend
            }
          };
          
          // Create temporary message in local state while waiting for server confirmation
          const tempMessage = {
            id: tempId || `temp-${Date.now()}`,
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            timestamp,
            status: 'sending',
            is_read: true // Our own messages are always read
          };
          
          // Dispatch to Redux
          store.dispatch(messageReceived({ 
            contactId, 
            message: tempMessage,
            tempId // Include the tempId for later replacement
          }));
          
          // Also update the contact's lastMessage for this contact
          store.dispatch(updateContactLastMessage({
            contactId,
            message: tempMessage
          }));
          
          // Notify the contacts context that a message has been sent
          EventRegister.emit('contactsChanged', { source: 'socket' });
          
          // Set a delivery timeout to mark message as failed if no response
          const messageTimeout = setTimeout(() => {
            console.log('[SOCKET-MIDDLEWARE] Message send timeout, marking as failed:', tempId);
            try {
              store.dispatch(messageReceived({ 
                contactId, 
                message: {
                  ...tempMessage,
                  status: 'failed',
                  delivery_failed: true,
                  error_message: 'Message delivery timed out'
                },
                tempId 
              }));
              if (tempId && messageTimeouts && messageTimeouts[tempId]) {
                delete messageTimeouts[tempId];
              }
            } catch (error) {
              console.error('[SOCKET-MIDDLEWARE] Error in timeout handler:', error);
            }
          }, 10000); 
          
          if (tempId && messageTimeouts) {
            try {
              messageTimeouts[tempId] = messageTimeout;
              console.log('[SOCKET-MIDDLEWARE] Stored timeout for message:', tempId);
              
              // Debug log to verify the timeout was stored correctly
              const storedKeys = Object.keys(messageTimeouts);
              console.log('[SOCKET-MIDDLEWARE] Updated messageTimeouts keys:', storedKeys.join(', '));
              console.log('[SOCKET-MIDDLEWARE] messageTimeouts includes our tempId:', 
                storedKeys.includes(tempId) ? 'yes' : 'no');
            } catch (error) {
              console.error('[SOCKET-MIDDLEWARE] Error storing timeout:', error);
            }
          } else {
            console.error('[SOCKET-MIDDLEWARE] Cannot store timeout - tempId or messageTimeouts missing:',
              { tempIdExists: !!tempId, messageTimeoutsExists: !!messageTimeouts });
          }
          
          // Send message via socket
          socket.emit('message', messageData, (ackData) => {
            try {
              console.log('[SOCKET-MIDDLEWARE] Message callback received:', ackData ? 'with data' : 'empty');
              console.log('[SOCKET-MIDDLEWARE] Looking for tempId in messageTimeouts:', tempId);
              
              // Detailed logging about messageTimeouts
              console.log('[SOCKET-MIDDLEWARE] Debug in callback - messageTimeouts type:', typeof messageTimeouts);
              console.log('[SOCKET-MIDDLEWARE] Debug in callback - messageTimeouts exists:', messageTimeouts ? 'yes' : 'no');
              
              if (messageTimeouts) {
                const keys = Object.keys(messageTimeouts);
                console.log('[SOCKET-MIDDLEWARE] Debug in callback - messageTimeouts keys:', 
                  keys.length > 0 ? keys.join(', ') : 'empty');
              }
              
              // Clear the timeout as we got a response
              if (tempId && messageTimeouts && messageTimeouts[tempId]) {
                clearTimeout(messageTimeouts[tempId]);
                delete messageTimeouts[tempId];
                console.log('[SOCKET-MIDDLEWARE] Cleared timeout for message in callback:', tempId);
              } else {
                console.log('[SOCKET-MIDDLEWARE] No timeout found in callback for tempId:', tempId);
              }
              
              // Handle acknowledgment (if the server supports it)
              if (ackData && ackData.error) {
                console.error('[SOCKET-MIDDLEWARE] Message send error:', ackData.error);
                
                // Mark message as failed
                store.dispatch(messageReceived({ 
                  contactId, 
                  message: {
                    ...tempMessage,
                    status: 'failed',
                    delivery_failed: true,
                    error_message: ackData.error
                  },
                  tempId
                }));
              }
            } catch (error) {
              console.error('[SOCKET-MIDDLEWARE] Error in socket emit callback:', error);
            }
          });
        });
      } else {
        console.error('[SOCKET-MIDDLEWARE] Cannot send message: Socket not connected');
        
        // Create a failed message directly since we know socket is not connected
        AsyncStorage.getItem('userId').then(senderId => {
          if (!senderId) return;
          
          const timestamp = new Date().toISOString();
          const failedMessage = {
            id: tempId || `temp-${Date.now()}`,
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            timestamp,
            status: 'failed',
            delivery_failed: true,
            is_read: true,
            error_message: 'Socket not connected'
          };
          
          store.dispatch(messageReceived({ 
            contactId, 
            message: failedMessage
          }));
        });
      }
    }
    
    return next(action);
  };
};

// Set up socket event listeners
const setupSocketListeners = (socket, store) => {
  if (!socket) {
    console.error('[SOCKET-MIDDLEWARE] Cannot set up listeners: socket is null');
    return;
  }

  // Handle new message received
  socket.on('newMessage', (data) => {
    try {
      console.log('[SOCKET-MIDDLEWARE] Received new message:', data);
      
      // Check if data is valid
      if (!data) {
        console.error('[SOCKET-MIDDLEWARE] Invalid message data received:', data);
        return;
      }
      
      // Check if this is a typed message or just raw data
      const messageType = data.type || MESSAGE_TYPES.PRIVATE_MESSAGE;
      const payload = data.payload || data;
      
      // Guard against empty payload
      if (!payload) {
        console.error('[SOCKET-MIDDLEWARE] Empty payload in message:', data);
        return;
      }
      
      handleMessageByType(messageType, payload, store);
    } catch (error) {
      console.error('[SOCKET-MIDDLEWARE] Error handling newMessage event:', error);
    }
  });
  
  // Handle message delivery confirmation
  socket.on('message_sent', (data) => {
    try {
      console.log('[SOCKET-MIDDLEWARE] Message delivery confirmation:', data);
      
      // Diagnostic logging for debugging
      console.log('[SOCKET-MIDDLEWARE] Debug - messageTimeouts type:', typeof messageTimeouts);
      console.log('[SOCKET-MIDDLEWARE] Debug - messageTimeouts exists:', messageTimeouts ? 'yes' : 'no');
      
      if (messageTimeouts) {
        const keys = Object.keys(messageTimeouts);
        console.log('[SOCKET-MIDDLEWARE] Debug - messageTimeouts keys:', keys.length > 0 ? keys.join(', ') : 'empty');
      } else {
        console.log('[SOCKET-MIDDLEWARE] Debug - messageTimeouts is null or undefined');
      }
      
      // Check if data is valid
      if (!data) {
        console.error('[SOCKET-MIDDLEWARE] Invalid message_sent data:', data);
        return;
      }
      
      if (!data.id) {
        console.error('[SOCKET-MIDDLEWARE] Missing message ID in delivery confirmation:', data);
        return;
      }
      
      if (!data.contactId) {
        console.error('[SOCKET-MIDDLEWARE] Missing contactId in delivery confirmation:', data);
        return;
      }
      
      // Check if we have a tempId for replacement
      if (data.tempId) {
        console.log('[SOCKET-MIDDLEWARE] Looking for tempId in messageTimeouts:', data.tempId);
        
        // Clear any existing timeout for this message
        if (messageTimeouts && messageTimeouts[data.tempId]) {
          try {
            clearTimeout(messageTimeouts[data.tempId]);
            delete messageTimeouts[data.tempId];
            console.log('[SOCKET-MIDDLEWARE] Cleared timeout for message:', data.tempId);
          } catch (timeoutError) {
            console.error('[SOCKET-MIDDLEWARE] Error clearing timeout:', timeoutError);
          }
        } else {
          console.log('[SOCKET-MIDDLEWARE] No timeout found for tempId:', data.tempId, 
            'Available tempIds:', messageTimeouts ? Object.keys(messageTimeouts) : 'none');
        }
        
        // We should replace the temp message with the real one
        store.dispatch(messageReceived({
          contactId: data.contactId,
          message: {
            id: data.id,
            sender_id: data.sender_id || data.senderId,
            receiver_id: data.receiver_id || data.receiverId,
            content: data.content || '',
            timestamp: data.timestamp || new Date().toISOString(),
            status: 'delivered',
            is_read: true
          },
          tempId: data.tempId
        }));
        
        // Force refresh the contacts list to ensure UI is updated
        store.dispatch(fetchContacts());
      } else {
        // Just update the status of an existing message
        store.dispatch(messageDelivered({
          contactId: data.contactId,
          messageId: data.id
        }));
      }
    } catch (error) {
      console.error('[SOCKET-MIDDLEWARE] Error handling message_sent event:', error);
    }
  });
  
  // Handle message read confirmation
  socket.on('message_read', (data) => {
    try {
      console.log('[SOCKET-MIDDLEWARE] Message read confirmation:', data);
      
      // Check if data is valid
      if (!data || !data.contactId) {
        console.error('[SOCKET-MIDDLEWARE] Invalid message_read data:', data);
        return;
      }
      
      // Update message read status
      store.dispatch(messageRead({
        contactId: data.contactId,
        messageId: data.messageId // Optional - if null, marks all messages as read
      }));
    } catch (error) {
      console.error('[SOCKET-MIDDLEWARE] Error handling message_read event:', error);
    }
  });
  
  // Handle socket connection error
  socket.on('connect_error', (error) => {
    console.error('[SOCKET-MIDDLEWARE] Connection error:', error?.message || 'Unknown error');
  });
  
  // Handle socket disconnection
  socket.on('disconnect', (reason) => {
    console.log('[SOCKET-MIDDLEWARE] Disconnected. Reason:', reason || 'Unknown reason');
  });
  
  // Setup general error handler
  socket.on('error', (error) => {
    console.error('[SOCKET-MIDDLEWARE] Socket error:', error?.message || 'Unknown error');
  });
  
  // Handle server-side socket events
  socket.on('server_event', (data) => {
    try {
      console.log('[SOCKET-MIDDLEWARE] Server event received:', data);
      
      if (!data || !data.type) {
        console.error('[SOCKET-MIDDLEWARE] Invalid server_event data:', data);
        return;
      }
      
      // Process different server event types
      switch (data.type) {
        case 'user_status_change':
          // Handle online/offline status
          break;
        case 'contact_update':
          // Handle contact updates from server
          break;
        // Add other server event types as needed
        default:
          console.log('[SOCKET-MIDDLEWARE] Unhandled server event type:', data.type);
      }
    } catch (error) {
      console.error('[SOCKET-MIDDLEWARE] Error handling server_event:', error);
    }
  });
};

// Handle different message types
const handleMessageByType = (type, payload, store) => {
  // Add a safety check for undefined payload
  if (!payload) {
    console.error('[SOCKET-MIDDLEWARE] Received undefined or null payload for message type:', type);
    return;
  }

  try {
    switch (type) {
      case MESSAGE_TYPES.PRIVATE_MESSAGE:
        // Regular message handling
        handlePrivateMessage(payload, store);
        break;
        
      case MESSAGE_TYPES.CONTACT_ADDED:
        // Handle new contact with potential message
        if (payload.user) {
          handleContactAdded(payload, store);
        } else {
          console.error('[SOCKET-MIDDLEWARE] Missing user data in CONTACT_ADDED payload:', payload);
        }
        break;
        
      case MESSAGE_TYPES.CONTACT_UPDATED:
        // Handle contact update
        if (payload.user) {
          store.dispatch(contactUpdated(payload.user));
        } else {
          console.error('[SOCKET-MIDDLEWARE] Missing user data in CONTACT_UPDATED payload:', payload);
        }
        break;
        
      case MESSAGE_TYPES.CONTACT_DELETED:
        // Handle contact deletion
        if (payload.contactId) {
          store.dispatch(contactDeleted(payload.contactId));
        } else {
          console.error('[SOCKET-MIDDLEWARE] Missing contactId in CONTACT_DELETED payload:', payload);
        }
        break;
        
      default:
        // Handle unknown message type as regular message
        console.log('[SOCKET-MIDDLEWARE] Unknown message type, processing as standard message:', type);
        handlePrivateMessage(payload, store);
    }
  } catch (error) {
    console.error('[SOCKET-MIDDLEWARE] Error handling message type:', type, error);
  }
};

// Handle private message
const handlePrivateMessage = async (data, store) => {
  try {
    // Validate required data
    if (!data) {
      console.error('[SOCKET-MIDDLEWARE] Received empty data for private message');
      return;
    }
    
    // Get current user ID to check if this is an incoming message
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      console.error('[SOCKET-MIDDLEWARE] No user ID found when processing message');
      return;
    }
    
    // Standardize field names (handle both camelCase and snake_case formats)
    const senderId = data.sender_id || data.senderId;
    if (!senderId) {
      console.error('[SOCKET-MIDDLEWARE] Missing sender ID in message data:', data);
      return;
    }
    
    // Safely access content with fallbacks and accommodate empty string
    let content = '';
    if (data.content !== undefined) {
      content = data.content;
    } else if (data.message !== undefined) {
      content = data.message;
    }
    
    const messageId = data.id || `temp-${Date.now()}`;
    const receiverId = (data.receiver_id || data.receiverId || userId).toString();
    const timestamp = data.timestamp || new Date().toISOString();
    
    // Don't process our own sent messages that come back via socket
    // These are already added to the conversation when we send them
    if (senderId.toString() === userId) {
      console.log('[SOCKET-MIDDLEWARE] Ignoring our own message received via socket');
      return;
    }
    
    // Create the message object in our expected format with safe defaults
    const message = {
      id: messageId,
      sender_id: senderId.toString(),
      receiver_id: receiverId,
      content: content,
      timestamp: timestamp,
      is_read: false,
      status: 'received'
    };

    let contactsService = null;
    try {
      contactsService = require('../../services/contactsService').default;
    } catch (error) {
      console.error('Error loading contactsService:', error);
    }
    
    try {
      // Check if this message contains auto-created contact information
      if (data.auto_created_contact) {
        console.log('[SOCKET-MIDDLEWARE] Message contains auto-created contact:', data.auto_created_contact);
        
        if (!data.auto_created_contact.id) {
          console.error('[SOCKET-MIDDLEWARE] Auto-created contact missing ID:', data.auto_created_contact);
          return;
        }
        
        // Add the contact to Redux store
        store.dispatch(contactAdded(data.auto_created_contact));
        
        // Using the contactId from the auto-created contact
        const contactId = data.auto_created_contact.id.toString();
        
        // Add the message to Redux store
        store.dispatch(messageReceived({ contactId, message }));
        
        // Also update the contact's lastMessage property for UI display
        store.dispatch(updateContactLastMessage({ contactId, message }));
        
        // Force refresh the contacts list to ensure UI is updated
        store.dispatch(fetchContacts());
        
        // Notify the contacts context that a new message has been received
        EventRegister.emit('contactsChanged', { source: 'socket' });
        return;
      }
      
      // Try to find the contact
      let contactInfo = null;
      
      if (senderId) {
        try {
          contactInfo = await contactsService.findContactByContactUserId(senderId.toString());
        } catch (contactError) {
          console.error('[SOCKET-MIDDLEWARE] Error finding contact by user ID:', contactError);
        }
      }
      
      // If not found, try finding by phone number if available
      if (!contactInfo && data.sender_phone_number) {
        try {
          contactInfo = await contactsService.findContactByPhoneNumber(data.sender_phone_number);
        } catch (phoneError) {
          console.error('[SOCKET-MIDDLEWARE] Error finding contact by phone:', phoneError);
        }
      }
      
      // If we still don't have a contact, create a temporary one
      if (!contactInfo && data.sender_phone_number) {
        const tempContactInfo = {
          id: `temp-${Date.now()}`,
          phone_number: data.sender_phone_number,
          nickname: data.sender_phone_number,
          user_id: userId,
          contact_user_id: senderId.toString(),
          is_temp: true
        };
        
        // Add the temp contact to Redux store
        store.dispatch(contactAdded(tempContactInfo));
        contactInfo = tempContactInfo;
      } else if (!contactInfo) {
        console.error('[SOCKET-MIDDLEWARE] Cannot process message - unable to identify contact:', data);
        return;
      }
      
      if (contactInfo && contactInfo.id) {
        const contactId = contactInfo.id.toString();
        
        // Add the message to Redux store
        store.dispatch(messageReceived({ contactId, message }));
        
        // Also update the contact's lastMessage property for UI display
        store.dispatch(updateContactLastMessage({ contactId, message }));
        
        // Force refresh the contacts list to ensure UI is updated
        store.dispatch(fetchContacts());
        
        // Notify the contacts context that a new message has been received
        EventRegister.emit('contactsChanged', { source: 'socket' });
      } else {
        console.error('[SOCKET-MIDDLEWARE] Contact info is missing ID:', contactInfo);
      }
    } catch (serviceError) {
      console.error('[SOCKET-MIDDLEWARE] Error with contact service:', serviceError);
    }
  } catch (error) {
    console.error('[SOCKET-MIDDLEWARE] Error processing private message:', error);
  }
};

// Handle contact added with possible message
const handleContactAdded = (data, store) => {
  try {
    // Add safety checks
    if (!data || !data.user) {
      console.error('[SOCKET-MIDDLEWARE] Invalid contact added data:', data);
      return;
    }
    
    if (!data.user.id) {
      console.error('[SOCKET-MIDDLEWARE] Contact data missing ID:', data.user);
      return;
    }
    
    // Add the contact to Redux store
    store.dispatch(contactAdded(data.user));
    
    // If there's an associated message, add it too
    if (data.message) {
      // Validate message data
      if (!data.message.id || !data.message.content) {
        console.error('[SOCKET-MIDDLEWARE] Invalid message data in contact added:', data.message);
        return;
      }
      
      const contactId = data.user.id.toString();
      store.dispatch(messageReceived({ 
        contactId, 
        message: data.message 
      }));
      
      // Also update the contact's lastMessage property for UI display
      store.dispatch(updateContactLastMessage({ 
        contactId, 
        message: data.message 
      }));
      
      // Force refresh the contacts list to ensure UI is updated
      store.dispatch(fetchContacts());
      
      // Notify the contacts context that a new contact with message has been added
      EventRegister.emit('contactsChanged', { source: 'socket' });
    }
    
    // Even if there's no message, notify that contacts have changed
    EventRegister.emit('contactsChanged', { source: 'socket' });
  } catch (error) {
    console.error('[SOCKET-MIDDLEWARE] Error processing contact added:', error);
  }
};

export default socketMiddleware; 