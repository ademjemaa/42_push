const express = require('express');
const router = express.Router();
const messageService = require('../services/messageService');
const auth = require('../middleware/auth');

// Get conversation with a contact
router.get('/conversation/:contactId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const contactId = req.params.contactId;
    
    console.log(`[BACKEND-ROUTES] Getting conversation, userId=${userId}, contactId=${contactId}`);
    
    // Get the messages
    const messages = await messageService.getConversation(userId, contactId);
    
    console.log(`[BACKEND-ROUTES] Returning ${messages.length} messages`);
    
    res.json(messages);
  } catch (error) {
    console.error('[BACKEND-ROUTES] Get conversation error:', error);
    res.status(400).json({ message: error.message || 'Failed to get conversation' });
  }
});

// Send a message to a contact
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }
    
    const messageData = {
      senderId: req.user.userId,
      receiverId,
      content,
      timestamp: new Date().toISOString()
    };
    
    // Use handleIncomingMessage which already calls saveMessage internally
    // This prevents duplicate message saving
    const message = await messageService.handleIncomingMessage(messageData);
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(400).json({ message: error.message || 'Failed to send message' });
  }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await messageService.getUnreadCount(req.user.userId);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(400).json({ message: error.message || 'Failed to get unread count' });
  }
});

// Get all unread messages
router.get('/unread', auth, async (req, res) => {
  try {
    const messages = await messageService.getUnreadMessages(req.user.userId);
    res.json(messages);
  } catch (error) {
    console.error('Get unread messages error:', error);
    res.status(400).json({ message: error.message || 'Failed to get unread messages' });
  }
});

// Delete conversation with a contact
router.delete('/conversation/:contactId', auth, async (req, res) => {
  try {
    console.log(`[BACKEND-ROUTES] Deleting conversation with contactId=${req.params.contactId}`);
    const result = await messageService.deleteConversation(req.user.userId, req.params.contactId);
    
    // If the service returned an error but didn't throw, handle it here
    if (result.success === false) {
      console.error('[BACKEND-ROUTES] Conversation deletion failed:', result.message);
      return res.status(400).json({ 
        message: result.message || 'Failed to delete conversation',
        error: result.error
      });
    }
    
    return res.json(result);
  } catch (error) {
    console.error('[BACKEND-ROUTES] Delete conversation error:', error);
    return res.status(400).json({ message: error.message || 'Failed to delete conversation' });
  }
});

module.exports = router; 