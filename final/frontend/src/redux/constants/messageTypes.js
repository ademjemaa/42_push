// Socket message types
export const MESSAGE_TYPES = {
  // Message related types
  PRIVATE_MESSAGE: 'PRIVATE_MESSAGE',
  MESSAGE_DELIVERED: 'MESSAGE_DELIVERED',
  MESSAGE_READ: 'MESSAGE_READ',
  
  // Contact related types
  CONTACT_ADDED: 'CONTACT_ADDED',
  CONTACT_UPDATED: 'CONTACT_UPDATED',
  CONTACT_DELETED: 'CONTACT_DELETED',
  
  // System message types
  USER_ONLINE: 'USER_ONLINE',
  USER_OFFLINE: 'USER_OFFLINE',
  TYPING_STARTED: 'TYPING_STARTED',
  TYPING_STOPPED: 'TYPING_STOPPED',
};

// Socket message payload structure examples
export const PAYLOAD_EXAMPLES = {
  PRIVATE_MESSAGE: {
    id: 'message-id',
    sender_id: 'sender-user-id',
    receiver_id: 'receiver-user-id',
    content: 'Message content',
    timestamp: '2023-06-15T12:34:56Z',
    is_read: false,
  },
  
  CONTACT_ADDED: {
    user: {
      id: 'user-id',
      phone_number: '+1234567890',
      nickname: 'John Doe',
      contact_user_id: 'contact-user-id',
      avatar: 'base64-encoded-image', // Optional
    },
    message: {
      id: 'message-id',
      content: 'Hello, I am a new contact',
      timestamp: '2023-06-15T12:34:56Z',
      sender_id: 'sender-user-id',
      receiver_id: 'receiver-user-id',
      is_read: false,
    },
  },
}; 