import { configureStore } from '@reduxjs/toolkit';
import contactsReducer from './slices/contactsSlice';
import messagesReducer from './slices/messagesSlice';
import authReducer from './slices/authSlice';
import socketMiddleware from './middleware/socketMiddleware';

const store = configureStore({
  reducer: {
    auth: authReducer,
    contacts: contactsReducer,
    messages: messagesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in the socket middleware
        ignoredActions: ['socket/connect', 'socket/disconnect'],
        ignoredPaths: ['socket.instance'],
      },
    }).concat(socketMiddleware),
});

export default store; 