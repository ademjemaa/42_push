const { runQuery, getOne, getAll } = require('../db/database');
const contactService = require('./contactService');

// Save a new message
const saveMessage = async (messageData) => {
  const { senderId, receiverId, content, timestamp } = messageData;
  
  try {
    // Insert message into database
    const result = await runQuery(
      'INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, ?)',
      [senderId, receiverId, content, timestamp || new Date().toISOString()]
    );
    
    // Get the created message
    const message = await getOne(
      'SELECT * FROM messages WHERE id = ?',
      [result.lastID]
    );
    
    return message;
  } catch (error) {
    throw error;
  }
};

// Get conversation between two users
const getConversation = async (userId, contactId) => {
  console.log(`[BACKEND-DEBUG] Getting conversation between userId=${userId} and contactId=${contactId}`);
  
  try {
    // Check if contactId is actually a contact record ID or a user ID
    const contactRecord = await getOne('SELECT * FROM contacts WHERE id = ?', [contactId]);
    
    if (contactRecord) {
      console.log(`[BACKEND-DEBUG] Found contact record: ${JSON.stringify(contactRecord)}`);
      console.log(`[BACKEND-DEBUG] This contact record represents user_id: ${contactRecord.contact_user_id}`);
      
      // If contactId is a contact record ID, use the contact_user_id instead
      if (contactRecord.contact_user_id) {
        console.log(`[BACKEND-DEBUG] Using contact_user_id=${contactRecord.contact_user_id} instead of contactId=${contactId}`);
        contactId = contactRecord.contact_user_id;
      }
    } else {
      console.log(`[BACKEND-DEBUG] No contact record found for ID ${contactId}, assuming it's a user ID`);
    }
    
    // Get all messages between the users
    console.log(`[BACKEND-DEBUG] Querying messages between userId=${userId} and contactId=${contactId}`);
    const messages = await getAll(`
      SELECT 
        id, 
        sender_id, 
        receiver_id, 
        content, 
        timestamp, 
        is_read
      FROM messages 
      WHERE 
        (sender_id = ? AND receiver_id = ?) OR 
        (sender_id = ? AND receiver_id = ?)
      ORDER BY timestamp ASC
    `, [userId, contactId, contactId, userId]);
    
    console.log(`[BACKEND-DEBUG] Found ${messages.length} messages in conversation`);
    
    // Mark received messages as read
    await runQuery(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [contactId, userId]
    );
    
    return messages;
  } catch (error) {
    console.error(`[BACKEND-DEBUG] Error in getConversation:`, error);
    throw error;
  }
};

// Get unread message count for a user
const getUnreadCount = async (userId) => {
  try {
    const result = await getOne(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [userId]
    );
    
    return result.count;
  } catch (error) {
    throw error;
  }
};

// Get unread messages for a user
const getUnreadMessages = async (userId) => {
  try {
    const messages = await getAll(
      'SELECT * FROM messages WHERE receiver_id = ? AND is_read = 0 ORDER BY timestamp ASC',
      [userId]
    );
    
    return messages;
  } catch (error) {
    throw error;
  }
};

// Delete conversation
const deleteConversation = async (userId, contactId) => {
  try {
    // Delete all messages between the users
    await runQuery(
      'DELETE FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
      [userId, contactId, contactId, userId]
    );
    
    return { success: true, message: 'Conversation deleted successfully' };
  } catch (error) {
    throw error;
  }
};

// Handle incoming message and auto-create contact if needed
const handleIncomingMessage = async (messageData) => {
  const { senderId, receiverId, content, timestamp } = messageData;
  
  console.log(`[BACKEND-DEBUG] Handling incoming message: senderId=${senderId}, receiverId=${receiverId}`);
  
  try {
    // Validate that both users exist before proceeding
    const senderUser = await getOne('SELECT * FROM users WHERE id = ?', [senderId]);
    if (!senderUser) {
      console.error(`[BACKEND-ERROR] Sender with ID ${senderId} not found in users table`);
      return { 
        error: true, 
        message: `User with ID ${senderId} not found` 
      };
    }
    
    const receiverUser = await getOne('SELECT * FROM users WHERE id = ?', [receiverId]);
    if (!receiverUser) {
      console.error(`[BACKEND-ERROR] Receiver with ID ${receiverId} not found in users table`);
      return { 
        error: true, 
        message: `User with ID ${receiverId} not found` 
      };
    }
    
    // Save the message once both sender and receiver are confirmed to exist
    const message = await saveMessage(messageData);
    console.log(`[BACKEND-DEBUG] Message saved with ID: ${message.id}`);
    
    
    // Check if the receiver has the sender as a contact
    const contact = await getOne(
      'SELECT * FROM contacts WHERE user_id = ? AND contact_user_id = ?',
      [receiverId, senderId]
    );
    
    let newContactCreated = false;
    let newContact = null;
    
    if (contact) {
      console.log(`[BACKEND-DEBUG] Receiver already has sender as contact: ${JSON.stringify(contact)}`);
      newContact = contact;
    } else {
      console.log(`[BACKEND-DEBUG] Creating new contact for receiver ${receiverId} with sender ${senderId}`);
      try {
        // Use the sender's phone number as both the contact phone number and nickname
        newContact = await contactService.findOrCreateContact(receiverId, senderUser.phone_number);
        console.log(`[BACKEND-DEBUG] Contact created successfully: ${JSON.stringify(newContact)}`);
        newContactCreated = true;
      } catch (contactError) {
        console.error(`[BACKEND-ERROR] Failed to create contact: ${contactError.message}`);
      }
    }
    
    // Return message with additional information about auto-created contact 
    return {
      ...message,
      auto_created_contact: newContactCreated ? newContact : null,
      sender_phone_number: senderUser.phone_number,
      sender_username: senderUser.username
    };
  } catch (error) {
    console.error(`[BACKEND-ERROR] Error in handleIncomingMessage: ${error.message}`);
    throw error;
  }
};

module.exports = {
  saveMessage,
  getConversation,
  getUnreadCount,
  getUnreadMessages,
  deleteConversation,
  handleIncomingMessage
}; 