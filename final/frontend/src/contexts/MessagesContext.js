import React, { createContext, useState, useContext, useEffect } from 'react';
import { messagesAPI, getSocket } from '../services/api';
import { useAuth } from './AuthContext';
import { useContacts } from './ContactsContext';

// Create Messages Context
export const MessagesContext = createContext();

// Messages Context Provider
export const MessagesProvider = ({ children }) => {
  const { userToken, userId } = useAuth();
  const { fetchContacts } = useContacts();
  const [conversations, setConversations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Listen for real-time messages when userToken changes
  useEffect(() => {
    if (!userToken || !userId) {
      console.log('[MESSAGES] No user token or ID, skipping socket setup');
      return;
    }
    
    const socket = getSocket();
    if (!socket) {
      // Silent failure - don't show error in console
      return;
    }
    
    console.log('[MESSAGES] Setting up message listeners for user ID:', userId);
    
    // Handle incoming messages
    const handleNewMessage = async (data) => {
      console.log('[MESSAGES] Received message data:', JSON.stringify(data));
      
      try {
        // Validate required fields
        if (!data.sender_id && !data.senderId) {
          console.error('[MESSAGES] Missing sender ID in message data:', JSON.stringify(data));
          return;
        }
        
        if (!data.content && !data.message) {
          console.error('[MESSAGES] Missing content in message data:', JSON.stringify(data));
          return;
        }
        
        if (!data.timestamp) {
          console.error('[MESSAGES] Missing timestamp in message data:', JSON.stringify(data));
          return;
        }
        
        // Standardize field names (handle both camelCase and snake_case formats)
        const senderId = (data.sender_id || data.senderId).toString();
        const content = data.content || data.message;
        const messageId = data.id || `temp-${Date.now()}`;
        const receiverId = (data.receiver_id || data.receiverId || userId).toString();
        
        console.log('[MESSAGES] Processing message - Sender:', senderId, 'Receiver:', receiverId);
        
        // Don't process our own sent messages that come back via socket
        // These are already added to the conversation when we send them
        if (senderId === userId) {
          console.log('[MESSAGES] Ignoring our own message received via socket');
          return;
        }

        // Check if this message contains auto-created contact information
        if (data.auto_created_contact) {
          console.log('[MESSAGES] Message contains auto-created contact:', data.auto_created_contact);
          
          // Trigger a refresh of the contacts list to show the new contact
          fetchContacts();
          
          // Using the contactId from the auto-created contact
          const contactId = data.auto_created_contact.id.toString();
          console.log('[MESSAGES] Using auto-created contact ID:', contactId);
          
          // Create the message object in our expected format
          const message = {
            id: messageId,
            sender_id: senderId,
            receiver_id: receiverId,
            content: content,
            timestamp: data.timestamp,
            is_read: false
          };
          
          // Update the conversations state with the new message
          setConversations(prev => {
            const prevMessages = prev[contactId] || [];
            
            // Check for duplicates
            const isDuplicate = prevMessages.some(msg => 
              msg.content === content &&
              Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 1000
            );
            
            if (isDuplicate) {
              console.log('[MESSAGES] Ignoring duplicate message');
              return prev;
            }
            
            console.log('[MESSAGES] Adding message to conversation with auto-created contactId:', contactId);
            return {
              ...prev,
              [contactId]: [...prevMessages, message]
            };
          });
          
          return;
        }
        
        // Import the contactService directly to avoid circular dependencies
        const contactsService = require('../services/contactsService');
        
        // Find the contact that represents this sender (user looking up sender)
        // This is a user receiving a message, so they need to find which contact
        // in their contact list represents the sender
        const contactInfo = await contactsService.findContactByContactUserId(senderId);
        
        if (contactInfo) {
          console.log('[MESSAGES] Found matching contact for sender:', contactInfo.id);
          const contactId = contactInfo.id.toString();
          
          // Create the message object in our expected format
          const message = {
            id: messageId,
            sender_id: senderId,
            receiver_id: receiverId,
            content: content,
            timestamp: data.timestamp,
            is_read: false
          };
          
          // Update the conversations state with the new message
          setConversations(prev => {
            const prevMessages = prev[contactId] || [];
            
            // Check for duplicates
            const isDuplicate = prevMessages.some(msg => 
              msg.content === content &&
              Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 1000
            );
            
            if (isDuplicate) {
              console.log('[MESSAGES] Ignoring duplicate message');
              return prev;
            }
            
            console.log('[MESSAGES] Adding message to conversation with contactId:', contactId);
            return {
              ...prev,
              [contactId]: [...prevMessages, message]
            };
          });
          
          // Fetch contacts to update last message preview
          fetchContacts();
        } else {
          console.log('[MESSAGES] No matching contact found for sender ID:', senderId);
          
          // Try finding by phone number if available
          if (data.sender_phone_number) {
            console.log('[MESSAGES] Trying to find contact by phone number:', data.sender_phone_number);
            const contactByPhone = await contactsService.findContactByPhoneNumber(data.sender_phone_number);
            
            if (contactByPhone) {
              console.log('[MESSAGES] Found contact by phone number:', contactByPhone.id);
              const contactId = contactByPhone.id.toString();
              
              // Create the message object in our expected format
              const message = {
                id: messageId,
                sender_id: senderId,
                receiver_id: receiverId,
                content: content,
                timestamp: data.timestamp,
                is_read: false
              };
              
              // Update the conversations state with the new message
              setConversations(prev => {
                const prevMessages = prev[contactId] || [];
                
                // Check for duplicates
                const isDuplicate = prevMessages.some(msg => 
                  msg.content === content &&
                  Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 1000
                );
                
                if (isDuplicate) {
                  console.log('[MESSAGES] Ignoring duplicate message');
                  return prev;
                }
                
                console.log('[MESSAGES] Adding message to conversation with contactId found by phone:', contactId);
                return {
                  ...prev,
                  [contactId]: [...prevMessages, message]
                };
              });
              
              // Refresh contacts to update last message preview
              fetchContacts();
              return;
            }
            
            console.log('[MESSAGES] No contact found by phone number either, triggering contacts refresh');
            fetchContacts();
          } else {
            console.log('[MESSAGES] Message will not be displayed until user refreshes conversation');
          }
        }
      } catch (error) {
        console.error('[MESSAGES] Error processing new message:', error);
      }
    };
    
    // Original fallback method without unread count
    const handleFallbackMessageUpdate = (senderId, data) => {
      setConversations(prevConversations => {
        const prevMessages = prevConversations[senderId] || [];
        
        // Check for duplicates
        const isDuplicate = prevMessages.some(msg => 
          msg.content === data.content && 
          Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 1000
        );
        
        if (isDuplicate) return prevConversations;
        
        const message = {
          id: data.id || `temp-${Date.now()}`,
          sender_id: senderId,
          receiver_id: userId,
          content: data.content,
          timestamp: data.timestamp,
          is_read: true // Mark all messages as read by default
        };
        
        console.log('[MESSAGES] Using fallback method to add message with senderId:', senderId);
        
        return {
          ...prevConversations,
          [senderId]: [...prevMessages, message]
        };
      });
    };
    
    console.log('[MESSAGES] Registering newMessage event handler');
    socket.on('newMessage', handleNewMessage);
    
    // Cleanup listener
    return () => {
      console.log('[MESSAGES] Cleaning up message listeners');
      if (socket) {
        socket.off('newMessage', handleNewMessage);
      }
    };
  }, [userToken, userId, fetchContacts]);
  
  // Listen for socket message delivery errors
  useEffect(() => {
    if (!userToken || !userId) {
      return;
    }
    
    const socket = getSocket();
    if (!socket) {
      return;
    }
    
    const handleMessageDeliveryFailure = (event) => {
      if (event.type === 'message_delivery_failed') {
        console.error('[MESSAGES] Message delivery failed:', event.error);
        
        // Get details about the failed message
        const originalMessage = event.originalMessage;
        if (originalMessage) {
          const receiverId = originalMessage.receiverId;
          
          // Mark the message as failed in the UI
          if (receiverId) {
            setConversations(prevConversations => {
              const prevMessages = prevConversations[receiverId] || [];
              
              // Create a new message list with the last message marked as failed
              const updatedMessages = [...prevMessages];
              if (updatedMessages.length > 0) {
                // Mark the last message as failed if it matches our content
                const lastMsg = updatedMessages[updatedMessages.length - 1];
                if (lastMsg.content === originalMessage.content) {
                  updatedMessages[updatedMessages.length - 1] = {
                    ...lastMsg,
                    delivery_failed: true,
                    error_message: event.error
                  };
                }
              }
              
              return {
                ...prevConversations,
                [receiverId]: updatedMessages
              };
            });
          }
        }
      }
    };
    
    socket.on('client_event', handleMessageDeliveryFailure);
    
    return () => {
      if (socket) {
        socket.off('client_event', handleMessageDeliveryFailure);
      }
    };
  }, [userToken, userId]);
  
  // Fetch conversation between current user and a contact
  const fetchConversation = async (contactId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First check if the contact still exists to avoid errors
      try {
        // Import the contactService directly to avoid circular dependencies
        const contactsService = require('../services/contactsService');
        const contactExists = await contactsService.checkContactExists(contactId);
        
        if (!contactExists) {
          console.log(`[MESSAGES] Contact ID ${contactId} no longer exists, skipping conversation fetch`);
          // Return an empty array to prevent further processing
          return [];
        }
      } catch (contactCheckError) {
        // If we can't confirm the contact exists, assume it doesn't to be safe
        console.log(`[MESSAGES] Unable to verify contact existence, assuming it's deleted`);
        return [];
      }
      
      // Get conversation between users
      const fetchedMessages = await messagesAPI.getConversation(contactId);
      console.log(`[MESSAGES-DEBUG] Fetched ${fetchedMessages.length} messages for contact ID: ${contactId}`);
      
      // Debug the first and last message if any exist
      if (fetchedMessages.length > 0) {
        console.log(`[MESSAGES-DEBUG] First message:`, JSON.stringify(fetchedMessages[0]));
        console.log(`[MESSAGES-DEBUG] Last message:`, JSON.stringify(fetchedMessages[fetchedMessages.length - 1]));
        console.log(`[MESSAGES-DEBUG] Unique sender IDs in conversation:`, 
          [...new Set(fetchedMessages.map(m => m.sender_id))].join(', ')
        );
      }
      
      // Update the conversation
      setConversations(prev => ({
        ...prev,
        [contactId]: fetchedMessages
      }));
      
      return fetchedMessages;
    } catch (error) {
      // Don't log errors for deleted contacts
      if (error.message && error.message.includes('not found')) {
        console.log(`[MESSAGES] Contact ID ${contactId} not found, returning empty conversation`);
        // Import deleted contacts cache to mark this contact as deleted
        try {
          const deletedContactsCache = require('../services/DeletedContactsCache').default;
          await deletedContactsCache.markAsDeleted(contactId);
        } catch (cacheError) {
          console.log('[MESSAGES] Could not access deleted contacts cache:', cacheError);
        }
        return [];
      }
      
      // Only set error for other types of errors
      setError(error.message);
      console.error(`[MESSAGES] Error fetching conversation:`, error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send message
  const sendMessage = async (receiverId, content) => {
    if (!userToken || !userId || !receiverId || !content) {
      console.error('[MESSAGES] Missing required data for sending message:', {
        hasToken: !!userToken,
        senderId: userId,
        receiverId,
        hasContent: !!content
      });
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[MESSAGES] Sending message to receiver ID:', receiverId);
      
      // Send message via API
      const message = await messagesAPI.sendMessage(receiverId, content);
      console.log('[MESSAGES] Message sent via API successfully:', JSON.stringify(message));
      
      // Update conversation
      setConversations(prevConversations => {
        const prevMessages = prevConversations[receiverId] || [];
        console.log('[MESSAGES] Updating conversation with new message');
        return {
          ...prevConversations,
          [receiverId]: [...prevMessages, message]
        };
      });
      
      // Fetch contacts to update last message
      console.log('[MESSAGES] Fetching contacts to update last message');
      fetchContacts();
      
      return message;
    } catch (e) {
      console.error('[MESSAGES] Error sending message:', e);
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Remove the fetchUnreadCount method or make it return 0
  const fetchUnreadCount = async () => {
    return 0;
  };
  
  // Mark as read - simplified to do nothing since we don't track unread
  const markAsRead = async (contactId) => {
    return true;
  };
  
  // Get cached conversation
  const getCachedConversation = (contactId) => {
    return conversations[contactId] || [];
  };
  
  // Delete conversation without unread count tracking
  const deleteConversation = async (contactId) => {
    if (!userToken || !contactId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await messagesAPI.deleteConversation(contactId);
      
      // Update conversations
      setConversations(prev => {
        const updated = { ...prev };
        delete updated[contactId];
        return updated;
      });
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear all messages (logout)
  const clearMessages = () => {
    setConversations({});
  };
  
  // Clear a specific conversation
  const clearConversation = async (contactId) => {
    if (!userToken || !contactId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Update conversations to clear messages for this contact
      setConversations(prev => {
        const updated = { ...prev };
        updated[contactId] = []; // Empty array instead of deleting the key
        return updated;
      });
      
      return true;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Context value with removed unread count
  const contextValue = {
    conversations,
    isLoading,
    error,
    fetchConversation,
    sendMessage,
    markAsRead,
    fetchUnreadCount,
    getCachedConversation,
    clearConversation,
    deleteConversation,
    clearMessages
  };
  
  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  );
};

// Messages Context Hook
export const useMessages = () => {
  const context = useContext(MessagesContext);
  
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  
  return context;
}; 