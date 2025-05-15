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
  
  // Handle private message
  socket.on('privateMessage', async (data) => {
    console.log('[SOCKET-SERVER] Received private message:', JSON.stringify(data));
    
    try {
      // Extract data from the message payload
      // Support both formats: { content } (frontend) and { message } (legacy/testing)
      const { senderId, receiverId, content, message, timestamp } = data;
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
        timestamp
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
          receiverId,
          timestamp
        });
      }
    } catch (error) {
      console.error('[SOCKET-SERVER] Error processing message:', error);
      
      // Try to notify the sender about the error
      if (data && data.senderId && connectedUsers[data.senderId]) {
        io.to(connectedUsers[data.senderId]).emit('message_error', {
          originalMessage: data,
          error: error.message || 'Unknown error occurred'
        });
      }
    }
  });
  
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