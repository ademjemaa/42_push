import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { messagesAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useContacts } from './ContactsContext';
import { EventRegister } from 'react-native-event-listeners';

// Import Redux actions and selectors
import {
  fetchConversation as fetchConversationAction,
  sendMessage as sendMessageAction,
  markAsRead as markAsReadAction,
  deleteConversation as deleteConversationAction,
  clearMessages as clearMessagesAction,
  clearConversation as clearConversationAction,
  selectConversation,
  selectMessagesStatus,
  selectMessagesError,
  selectUnreadCount,
  selectTotalUnreadCount
} from '../redux/slices/messagesSlice';

// Create Messages Context
export const MessagesContext = createContext();

// Messages Context Provider
export const MessagesProvider = ({ children }) => {
  const { userToken, userId } = useAuth();
  const { fetchContacts } = useContacts();
  const dispatch = useDispatch();
  
  // Get status and error from Redux
  const status = useSelector(selectMessagesStatus);
  const error = useSelector(selectMessagesError);
  const isLoading = status === 'loading';
  
  // When authentication changes, connect or disconnect socket via Redux
  useEffect(() => {
    if (userToken && userId) {
      // Connect socket via Redux action
      dispatch({ type: 'socket/connect', payload: { userId } });
      console.log('[MESSAGES] Dispatched socket connect action for user:', userId);
    } else {
      // Disconnect socket via Redux action
      dispatch({ type: 'socket/disconnect' });
      console.log('[MESSAGES] Dispatched socket disconnect action');
    }
    
    // Cleanup on unmount
    return () => {
      if (userToken && userId) {
        dispatch({ type: 'socket/disconnect' });
      }
    };
  }, [userToken, userId, dispatch]);
  
  // Notify contacts context that messages have changed
  const notifyContactsChanged = () => {
    EventRegister.emit('contactsChanged', { source: 'messages' });
  };
  
  // Fetch a conversation using Redux
  const fetchConversation = async (contactId) => {
    try {
      await dispatch(fetchConversationAction(contactId)).unwrap();
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error fetching conversation:', error);
      return false;
    }
  };
  
  // Send a message using Redux
  const sendMessage = async (receiverId, content, contactId) => {
    try {
      if (!contactId) {
        console.error('[MESSAGES] Missing contactId for sendMessage');
        return null;
      }
      
      // Emit message via socket middleware
      dispatch({ 
        type: 'socket/sendMessage', 
        payload: { receiverId, content, contactId } 
      });
      
      // Always notify contacts of change to update UI with latest message preview
      setTimeout(() => {
        notifyContactsChanged();
      }, 500);
      
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error sending message:', error);
      return false;
    }
  };
  
  // Mark messages as read using Redux
  const markAsRead = async (contactId) => {
    try {
      await dispatch(markAsReadAction(contactId)).unwrap();
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error marking conversation as read:', error);
      return false;
    }
  };
  
  // Get a cached conversation using Redux selector
  const getCachedConversation = (contactId) => {
    return useSelector(state => selectConversation(state, contactId));
  };
  
  // Delete a conversation using Redux
  const deleteConversation = async (contactId) => {
    try {
      await dispatch(deleteConversationAction(contactId)).unwrap();
      
      // Notify contacts of change
      notifyContactsChanged();
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error deleting conversation:', error);
      return false;
    }
  };
  
  // Clear all messages using Redux
  const clearMessages = () => {
    dispatch(clearMessagesAction());
  };
  
  // Clear a specific conversation using Redux
  const clearConversation = async (contactId) => {
    try {
      dispatch(clearConversationAction(contactId));
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error clearing conversation:', error);
      return false;
    }
  };
  
  // Get unread count for a specific contact
  const getUnreadCount = (contactId) => {
    return useSelector(state => selectUnreadCount(state, contactId));
  };
  
  // Get total unread count across all conversations
  const getTotalUnreadCount = () => {
    return useSelector(selectTotalUnreadCount);
  };
  
  // Provide the same interface to components, but now using Redux under the hood
  const contextValue = {
    isLoading,
    error,
    fetchConversation,
    sendMessage,
    markAsRead,
    getCachedConversation,
    deleteConversation,
    clearMessages,
    clearConversation,
    getUnreadCount,
    getTotalUnreadCount,
    notifyContactsChanged
  };

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  );
};

// Custom hook for using messages
export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}; 