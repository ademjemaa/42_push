import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { messagesAPI } from '../../services/api';

// Async thunks
export const fetchConversation = createAsyncThunk(
  'messages/fetchConversation',
  async (contactId, { rejectWithValue }) => {
    try {
      const messages = await messagesAPI.getConversation(contactId);
      return { contactId, messages };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ receiverId, content, contactId }, { rejectWithValue }) => {
    try {
      const message = await messagesAPI.sendMessage(receiverId, content);
      return { contactId, message };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const markAsRead = createAsyncThunk(
  'messages/markAsRead',
  async (contactId, { rejectWithValue }) => {
    try {
      await messagesAPI.markConversationAsRead(contactId);
      return contactId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteConversation = createAsyncThunk(
  'messages/deleteConversation',
  async (contactId, { rejectWithValue }) => {
    try {
      await messagesAPI.deleteConversation(contactId);
      return contactId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Messages slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState: {
    conversations: {}, // { contactId: [messages] }
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    unreadCounts: {}, // { contactId: count }
  },
  reducers: {
    // Handle socket events directly in the reducer
    messageReceived: (state, action) => {
      const { contactId, message, tempId } = action.payload;
      if (!state.conversations[contactId]) {
        state.conversations[contactId] = [];
      }
      
      // If we have a tempId, replace the temporary message with the real one
      if (tempId) {
        const tempIndex = state.conversations[contactId].findIndex(msg => msg.id === tempId);
        if (tempIndex !== -1) {
          // Replace the temp message with the real one
          state.conversations[contactId][tempIndex] = {
            ...message,
            sending: false
          };
          return;
        }
      }
      
      // Check for duplicates before adding
      const isDuplicate = state.conversations[contactId].some(msg => 
        msg.id === message.id || 
        (msg.content === message.content && 
         Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000)
      );
      
      if (!isDuplicate) {
        state.conversations[contactId].push(message);
        
        // Sort messages by timestamp (ascending order, oldest first)
        state.conversations[contactId].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        // Increment unread count if this is an incoming message
        if (!message.is_read) {
          state.unreadCounts[contactId] = (state.unreadCounts[contactId] || 0) + 1;
        }
      }
    },
    
    messageDelivered: (state, action) => {
      const { contactId, messageId } = action.payload;
      if (state.conversations[contactId]) {
        const message = state.conversations[contactId].find(msg => msg.id === messageId);
        if (message) {
          message.status = 'delivered';
        }
      }
    },
    
    messageRead: (state, action) => {
      const { contactId, messageId } = action.payload;
      if (state.conversations[contactId]) {
        // Mark specific message as read
        if (messageId) {
          const message = state.conversations[contactId].find(msg => msg.id === messageId);
          if (message) {
            message.is_read = true;
          }
        } 
        // Mark all messages as read
        else {
          state.conversations[contactId].forEach(message => {
            message.is_read = true;
          });
          state.unreadCounts[contactId] = 0;
        }
      }
    },
    
    clearMessages: (state) => {
      state.conversations = {};
      state.status = 'idle';
      state.error = null;
      state.unreadCounts = {};
    },
    
    // Clear a specific conversation
    clearConversation: (state, action) => {
      const contactId = action.payload;
      delete state.conversations[contactId];
      delete state.unreadCounts[contactId];
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchConversation
      .addCase(fetchConversation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        const { contactId, messages } = action.payload;
        // Store the messages and ensure they're sorted by timestamp
        state.conversations[contactId] = [...messages].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchConversation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Handle sendMessage
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { contactId, message } = action.payload;
        if (!state.conversations[contactId]) {
          state.conversations[contactId] = [];
        }
        state.conversations[contactId].push(message);
        
        // Sort messages by timestamp (ascending order, oldest first)
        state.conversations[contactId].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
      })
      
      // Handle markAsRead
      .addCase(markAsRead.fulfilled, (state, action) => {
        const contactId = action.payload;
        if (state.conversations[contactId]) {
          state.conversations[contactId].forEach(message => {
            message.is_read = true;
          });
          state.unreadCounts[contactId] = 0;
        }
      })
      
      // Handle deleteConversation
      .addCase(deleteConversation.fulfilled, (state, action) => {
        const contactId = action.payload;
        delete state.conversations[contactId];
        delete state.unreadCounts[contactId];
      })
      
      // Also clear messages when user logs out
      .addCase('auth/logout/fulfilled', (state) => {
        state.conversations = {};
        state.status = 'idle';
        state.error = null;
        state.unreadCounts = {};
      });
  },
});

// Export actions and reducer
export const { 
  messageReceived, 
  messageDelivered, 
  messageRead, 
  clearMessages, 
  clearConversation 
} = messagesSlice.actions;
export default messagesSlice.reducer;

// Simple selectors
const selectMessages = state => state.messages;
const selectConversations = state => state.messages.conversations;
export const selectMessagesStatus = state => state.messages.status;
export const selectMessagesError = state => state.messages.error;
const selectUnreadCounts = state => state.messages.unreadCounts;

// Memoized selectors
export const selectConversation = createSelector(
  [selectConversations, (_, contactId) => contactId],
  (conversations, contactId) => conversations[contactId] || []
);

export const selectAllConversations = createSelector(
  [selectConversations],
  (conversations) => conversations
);

export const selectUnreadCount = createSelector(
  [selectUnreadCounts, (_, contactId) => contactId],
  (unreadCounts, contactId) => unreadCounts[contactId] || 0
);

export const selectTotalUnreadCount = createSelector(
  [selectUnreadCounts],
  (unreadCounts) => Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
); 