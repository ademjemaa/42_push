const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { initDb } = require('./db/database');

// Import routes
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contacts');
const messageRoutes = require('./routes/messages');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io connection handling
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Store user connection
  socket.on('register', async (userId) => {
    try {
      // Check if user exists in database before registering
      if (!userId) {
        console.error('[SOCKET-SERVER] Cannot register socket: No user ID provided');
        return;
      }
      
      // Import user service for DB check
      const { getOne } = require('./db/database');
      
      // Check if user exists in the database
      const userExists = await getOne('SELECT id FROM users WHERE id = ?', [userId]);
      
      if (!userExists) {
        console.error(`[SOCKET-SERVER] Cannot register socket: User ID ${userId} does not exist in database`);
        // Emit error back to client
        socket.emit('socket_error', { 
          type: 'auth_error', 
          message: 'User not found in database' 
        });
        return;
      }
      
      // User exists, register the socket connection
      connectedUsers[userId] = socket.id;
      console.log(`User ${userId} registered with socket ${socket.id}`);
      
      // Confirm registration to client
      socket.emit('register_success', { userId });
    } catch (error) {
      console.error(`[SOCKET-SERVER] Error registering user ${userId}:`, error);
      socket.emit('socket_error', { 
        type: 'server_error', 
        message: 'Server error during registration' 
      });
    }
  });
  
  // Handle messages with type and payload
  socket.on('message', async (data) => {
    console.log('[SOCKET-SERVER] Received message:', JSON.stringify(data));
    
    try {
      // Check if this is a typed message or just raw data
      const messageType = data.type || 'PRIVATE_MESSAGE';
      const payload = data.payload || data;
      
      // Handle different message types
      switch (messageType) {
        case 'PRIVATE_MESSAGE':
          await handlePrivateMessage(socket, payload);
          break;
        
        case 'CONTACT_ADDED':
          await handleContactAdded(socket, payload);
          break;
          
        case 'CONTACT_UPDATED':
          await handleContactUpdated(socket, payload);
          break;
          
        case 'CONTACT_DELETED':
          await handleContactDeleted(socket, payload);
          break;
          
        default:
          // Default to handling as a private message
          await handlePrivateMessage(socket, payload);
      }
    } catch (error) {
      console.error('[SOCKET-SERVER] Error processing message:', error);
      
      // Try to notify the sender about the error
      if (data.payload && data.payload.senderId && connectedUsers[data.payload.senderId]) {
        io.to(connectedUsers[data.payload.senderId]).emit('message_error', {
          originalMessage: data,
          error: error.message || 'Unknown error occurred'
        });
      } else if (data.senderId && connectedUsers[data.senderId]) {
        io.to(connectedUsers[data.senderId]).emit('message_error', {
          originalMessage: data,
          error: error.message || 'Unknown error occurred'
        });
      }
    }
  });
  
  // For backward compatibility
  socket.on('privateMessage', async (data) => {
    console.log('[SOCKET-SERVER] Received legacy private message:', JSON.stringify(data));
    await handlePrivateMessage(socket, data);
  });
  
  // Handle private message
  async function handlePrivateMessage(socket, data) {
    try {
      // Extract data depending on format (direct or wrapped with type/payload)
      let messageData = data;
      
      // If data is wrapped in a payload structure, extract it
      if (data.type && data.payload) {
        messageData = data.payload;
      }
      
      // Extract data from the message payload
      // Support both formats: { content } (frontend) and { message } (legacy/testing)
      const { senderId, receiverId, content, message, timestamp, tempId } = messageData;
      const messageContent = content || message; // Use content if provided, fallback to message
      
      if (!senderId || !receiverId || (!content && !message) || !timestamp) {
        console.error('[SOCKET-SERVER] Invalid message format:', JSON.stringify(data));
        return;
      }
      
      console.log(`[SOCKET-SERVER] Processing message from ${senderId} to ${receiverId}`);
      
      // Save message to database
      const messageService = require('./services/messageService');
      const result = await messageService.handleIncomingMessage({
        senderId,
        receiverId,
        content: messageContent,
        timestamp,
        tempId // Pass tempId to the message service
      });
      
      // Check if there was an error
      if (result.error) {
        console.error(`[SOCKET-SERVER] Error processing message: ${result.message}`);
        
        // Notify the sender of the error
        if (connectedUsers[senderId]) {
          io.to(connectedUsers[senderId]).emit('message_error', {
            originalMessage: data,
            error: result.message
          });
        }
        return;
      }
      
      const savedMessage = result;
      console.log(`[SOCKET-SERVER] Message saved with ID: ${savedMessage.id}`);
      
      // If receiver is online, send them the message
      if (connectedUsers[receiverId]) {
        console.log(`[SOCKET-SERVER] Receiver ${receiverId} is online with socket ${connectedUsers[receiverId]}, sending real-time message`);
        
        // Construct the full message object to send
        const messagePayload = {
          type: 'PRIVATE_MESSAGE',
          payload: {
          id: savedMessage.id,
          sender_id: senderId,
          receiver_id: receiverId, 
          content: messageContent,
          timestamp,
          is_read: false,
          // Include auto-created contact information if available
          auto_created_contact: savedMessage.auto_created_contact || null,
          sender_phone_number: savedMessage.sender_phone_number,
          sender_username: savedMessage.sender_username
          }
        };
        
        console.log(`[SOCKET-SERVER] Emitting message to socket ${connectedUsers[receiverId]}:`, JSON.stringify(messagePayload));
        
        // Emit directly to the receiver's socket
        io.to(connectedUsers[receiverId]).emit('newMessage', messagePayload);
      } else {
        console.log(`[SOCKET-SERVER] Receiver ${receiverId} is offline, message will be delivered when they reconnect`);
      }
      
      // Also confirm receipt to sender
      if (connectedUsers[senderId]) {
        io.to(connectedUsers[senderId]).emit('message_sent', {
          id: savedMessage.id,
          contactId: savedMessage.contactId,
          receiverId,
          senderId,
          content: messageContent,
          timestamp,
          tempId: tempId // Include the tempId in the response for replacement in the frontend
        });
      }
    } catch (error) {
      console.error('[SOCKET-SERVER] Error processing private message:', error);
      throw error;
    }
  }
  
  // Handle contact added message
  async function handleContactAdded(socket, data) {
    try {
      const { senderId, user, message } = data;
      
      if (!senderId || !user) {
        console.error('[SOCKET-SERVER] Invalid contact added format:', JSON.stringify(data));
        return;
      }
      
      console.log(`[SOCKET-SERVER] Processing contact added from ${senderId}`);
      
      // Save contact to database
      const contactsService = require('./services/contactsService');
      const savedContact = await contactsService.createContact(user);
      
      // If there's an associated message, save it too
      let savedMessage = null;
      if (message) {
        const messageService = require('./services/messageService');
        savedMessage = await messageService.handleIncomingMessage({
          senderId: message.sender_id,
          receiverId: message.receiver_id,
          content: message.content,
          timestamp: message.timestamp
        });
      }
      
      // Notify the receiver about the new contact
      const receiverId = user.user_id;
      if (connectedUsers[receiverId]) {
        console.log(`[SOCKET-SERVER] Receiver ${receiverId} is online, sending contact added notification`);
        
        // Construct the payload
        const contactPayload = {
          type: 'CONTACT_ADDED',
          payload: {
            user: savedContact,
            message: savedMessage
          }
        };
        
        // Emit directly to the receiver's socket
        io.to(connectedUsers[receiverId]).emit('newMessage', contactPayload);
      }
      
      // Confirm to sender
      if (connectedUsers[senderId]) {
        io.to(connectedUsers[senderId]).emit('contact_added', {
          contactId: savedContact.id,
          success: true
        });
      }
    } catch (error) {
      console.error('[SOCKET-SERVER] Error processing contact added:', error);
      throw error;
    }
  }
  
  // Handle contact updated message
  async function handleContactUpdated(socket, data) {
    try {
      const { senderId, contactId, updates } = data;
      
      if (!senderId || !contactId || !updates) {
        console.error('[SOCKET-SERVER] Invalid contact update format:', JSON.stringify(data));
        return;
      }
      
      console.log(`[SOCKET-SERVER] Processing contact update from ${senderId} for contact ${contactId}`);
      
      // Update contact in database
      const contactsService = require('./services/contactsService');
      const updatedContact = await contactsService.updateContact(contactId, updates);
      
      // Notify the contact owner
      if (updatedContact.user_id && connectedUsers[updatedContact.user_id]) {
        console.log(`[SOCKET-SERVER] Owner ${updatedContact.user_id} is online, sending contact update notification`);
        
        // Construct the payload
        const updatePayload = {
          type: 'CONTACT_UPDATED',
          payload: {
            user: updatedContact
          }
        };
        
        // Emit directly to the owner's socket
        io.to(connectedUsers[updatedContact.user_id]).emit('newMessage', updatePayload);
      }
      
      // Confirm to sender
      if (connectedUsers[senderId]) {
        io.to(connectedUsers[senderId]).emit('contact_updated', {
          contactId: updatedContact.id,
          success: true
        });
      }
    } catch (error) {
      console.error('[SOCKET-SERVER] Error processing contact update:', error);
      throw error;
    }
  }
  
  // Handle contact deleted message
  async function handleContactDeleted(socket, data) {
    try {
      const { senderId, contactId } = data;
      
      if (!senderId || !contactId) {
        console.error('[SOCKET-SERVER] Invalid contact deletion format:', JSON.stringify(data));
        return;
      }
      
      console.log(`[SOCKET-SERVER] Processing contact deletion from ${senderId} for contact ${contactId}`);
      
      // Get contact info before deletion to know the owner
      const contactsService = require('./services/contactsService');
      const contact = await contactsService.getContact(contactId);
      const ownerId = contact ? contact.user_id : null;
      
      // Delete contact from database
      await contactsService.deleteContact(contactId);
      
      // Notify the contact owner
      if (ownerId && connectedUsers[ownerId]) {
        console.log(`[SOCKET-SERVER] Owner ${ownerId} is online, sending contact deletion notification`);
        
        // Construct the payload
        const deletePayload = {
          type: 'CONTACT_DELETED',
          payload: {
            contactId
          }
        };
        
        // Emit directly to the owner's socket
        io.to(connectedUsers[ownerId]).emit('newMessage', deletePayload);
      }
      
      // Confirm to sender
      if (connectedUsers[senderId]) {
        io.to(connectedUsers[senderId]).emit('contact_deleted', {
          contactId,
          success: true
        });
      }
    } catch (error) {
      console.error('[SOCKET-SERVER] Error processing contact deletion:', error);
      throw error;
    }
  }
  
  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove user from connected users
    const userId = Object.keys(connectedUsers).find(
      key => connectedUsers[key] === socket.id
    );
    
    if (userId) {
      delete connectedUsers[userId];
      console.log(`User ${userId} disconnected`);
    }
    
    console.log('Client disconnected');
  });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);

// Initialize database
initDb()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database initialization failed', err);
    process.exit(1);
  });

module.exports = { app, io }; 