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

export const MessagesContext = createContext();

export const MessagesProvider = ({ children }) => {
  const { userToken, userId } = useAuth();
  const dispatch = useDispatch();
  
  const status = useSelector(selectMessagesStatus);
  const error = useSelector(selectMessagesError);
  const isLoading = status === 'loading';
  
  useEffect(() => {
    if (userToken && userId) {
      dispatch({ type: 'socket/connect', payload: { userId } });
      console.log('[MESSAGES] Dispatched socket connect action for user:', userId);
    } else {
      dispatch({ type: 'socket/disconnect' });
      console.log('[MESSAGES] Dispatched socket disconnect action');
    }
    
    return () => {
      if (userToken && userId) {
        dispatch({ type: 'socket/disconnect' });
      }
    };
  }, [userToken, userId, dispatch]);
  
  const notifyContactsChanged = () => {
    EventRegister.emit('contactsChanged', { source: 'messages' });
  };
  
  const fetchConversation = async (contactId) => {
    try {
      await dispatch(fetchConversationAction(contactId)).unwrap();
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error fetching conversation:', error);
      return false;
    }
  };
  
  const sendMessage = async (receiverId, content, contactId) => {
    try {
      if (!contactId) {
        console.error('[MESSAGES] Missing contactId for sendMessage');
        return null;
      }
      
      dispatch({ 
        type: 'socket/sendMessage', 
        payload: { receiverId, content, contactId } 
      });
      
      setTimeout(() => {
        notifyContactsChanged();
      }, 500);
      
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error sending message:', error);
      return false;
    }
  };
  
  const markAsRead = async (contactId) => {
    try {
      await dispatch(markAsReadAction(contactId)).unwrap();
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error marking conversation as read:', error);
      return false;
    }
  };
  
  const getCachedConversation = (contactId) => {
    return useSelector(state => selectConversation(state, contactId));
  };
  
  const deleteConversation = async (contactId) => {
    if (!contactId) {
      console.log('[MESSAGES] No contactId provided for deleteConversation, skipping');
      return true;
    }
    
    try {
      await dispatch(deleteConversationAction(contactId)).unwrap();
      
      notifyContactsChanged();
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error deleting conversation:', error);
      
      try {
        dispatch(clearConversationAction(contactId));
      } catch (clearError) {
        console.error('[MESSAGES] Error clearing local conversation state:', clearError);
      }
      
      return true;
    }
  };
  
  const clearMessages = () => {
    dispatch(clearMessagesAction());
  };
  
  const clearConversation = async (contactId) => {
    try {
      dispatch(clearConversationAction(contactId));
      return true;
    } catch (error) {
      console.error('[MESSAGES] Error clearing conversation:', error);
      return false;
    }
  };
  
  const getUnreadCount = (contactId) => {
    return useSelector(state => selectUnreadCount(state, contactId));
  };
  
  const getTotalUnreadCount = () => {
    return useSelector(selectTotalUnreadCount);
  };
  
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

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}; 