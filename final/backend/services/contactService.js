const { runQuery, getOne, getAll } = require('../db/database');
const userService = require('./userService');
// Remove direct import of messageService to break circular dependency
// const messageService = require('./messageService');

// Get all contacts for a user
const getAllContacts = async (userId) => {
  try {
    // Join with users table to get the contact's user information if available
    const contacts = await getAll(`
      SELECT 
        c.id, 
        c.user_id, 
        c.contact_user_id, 
        c.phone_number, 
        c.nickname, 
        c.avatar, 
        c.created_at,
        u.username as contact_username
      FROM contacts c
      LEFT JOIN users u ON c.contact_user_id = u.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [userId]);
    
    // Get the last message for each contact
    for (let contact of contacts) {
      const lastMessage = await getOne(`
        SELECT 
          id, 
          content, 
          timestamp,
          sender_id,
          receiver_id 
        FROM messages 
        WHERE 
          (sender_id = ? AND receiver_id = ?) OR 
          (sender_id = ? AND receiver_id = ?)
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [userId, contact.contact_user_id || null, contact.contact_user_id || null, userId]);
      
      contact.lastMessage = lastMessage || null;
    }
    
    return contacts;
  } catch (error) {
    throw error;
  }
};

// Get a contact by ID
const getContactById = async (userId, contactId) => {
  try {
    const contact = await getOne(`
      SELECT 
        c.id, 
        c.user_id, 
        c.contact_user_id, 
        c.phone_number, 
        c.nickname, 
        c.avatar, 
        c.created_at,
        u.username as contact_username
      FROM contacts c
      LEFT JOIN users u ON c.contact_user_id = u.id
      WHERE c.id = ? AND c.user_id = ?
    `, [contactId, userId]);
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    return contact;
  } catch (error) {
    throw error;
  }
};

// Create a new contact
const createContact = async (userId, contactData) => {
  const { phone_number, nickname } = contactData;
  
  try {
    // Validate phone number format: 0 followed by 9 digits
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone_number)) {
      throw new Error('Phone number must be 0 followed by 9 digits');
    }
    
    // Get the current user to check if they're trying to add themselves
    const currentUser = await userService.getUserById(userId);
    if (!currentUser) {
      throw new Error('Your user account was not found');
    }
    
    // Check if trying to add own number
    if (currentUser.phone_number === phone_number) {
      throw new Error('You cannot add your own number as a contact');
    }
    
    // Check if contact already exists for this user
    const existingContact = await getOne(
      'SELECT * FROM contacts WHERE user_id = ? AND phone_number = ?',
      [userId, phone_number]
    );
    
    if (existingContact) {
      throw new Error('Contact already exists in your contacts list');
    }
    
    // Check if the phone number belongs to a registered user
    const contactUser = await userService.findByPhoneNumber(phone_number);
    
    // Only allow adding users that exist in the system
    if (!contactUser) {
      throw new Error('No registered user found with this phone number');
    }
    
    const contactUserId = contactUser.id;
    
    // Insert contact into database
    const result = await runQuery(
      'INSERT INTO contacts (user_id, contact_user_id, phone_number, nickname) VALUES (?, ?, ?, ?)',
      [userId, contactUserId, phone_number, nickname || phone_number]
    );
    
    // Get the created contact
    const contact = await getOne(`
      SELECT 
        c.id, 
        c.user_id, 
        c.contact_user_id, 
        c.phone_number, 
        c.nickname, 
        c.avatar, 
        c.created_at,
        u.username as contact_username
      FROM contacts c
      LEFT JOIN users u ON c.contact_user_id = u.id
      WHERE c.id = ?
    `, [result.lastID]);
    
    return contact;
  } catch (error) {
    throw error;
  }
};

// Update a contact
const updateContact = async (userId, contactId, contactData) => {
  const { nickname, avatar } = contactData;
  
  try {
    // Check if contact exists
    const contact = await getOne(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    // Update contact in database
    const updateFields = [];
    const updateParams = [];
    
    if (nickname !== undefined) {
      // Validate that nickname is not empty
      if (nickname === null || nickname === '') {
        throw new Error('Nickname cannot be empty');
      }
      
      updateFields.push('nickname = ?');
      updateParams.push(nickname);
    }
    
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      updateParams.push(avatar);
    }
    
    if (updateFields.length === 0) {
      return await getContactById(userId, contactId);
    }
    
    // Add contactId and userId to params
    updateParams.push(contactId);
    updateParams.push(userId);
    
    await runQuery(
      `UPDATE contacts SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateParams
    );
    
    // Get the updated contact
    return await getContactById(userId, contactId);
  } catch (error) {
    throw error;
  }
};

// Delete a contact
const deleteContact = async (userId, contactId) => {
  try {
    // Check if contact exists
    const contact = await getOne(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );
    
    if (!contact) {
      // If contact doesn't exist, return success instead of throwing an error
      // This helps with race conditions where a contact might be deleted multiple times
      console.log(`[CONTACT-SERVICE] Contact with ID ${contactId} not found for user ${userId}, considering it already deleted`);
      return { success: true, message: 'Contact already deleted or does not exist' };
    }
    
    // Get the contact_user_id (if it exists) for message deletion
    const contactUserId = contact.contact_user_id;
    
    try {
      // Delete all messages between the users - wrapped in try/catch to continue even if message deletion fails
      if (contactUserId) {
        console.log(`[CONTACT-SERVICE] Deleting messages between user ${userId} and contact user ${contactUserId}`);
        
        // Lazy-load messageService to avoid circular dependency
        const messageService = require('./messageService');
        await messageService.deleteConversation(userId, contactUserId);
      } else {
        console.log(`[CONTACT-SERVICE] Contact has no associated user ID - deleting messages using contact ID directly`);
        // Use the contact ID as a fallback when there is no associated user
        await runQuery(
          'DELETE FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
          [userId, contactId, contactId, userId]
        );
      }
    } catch (messageError) {
      // Log the error but continue with contact deletion
      console.error(`[CONTACT-SERVICE] Error deleting messages: ${messageError.message}`);
    }
    
    // Delete contact from database
    console.log(`[CONTACT-SERVICE] Deleting contact record ID: ${contactId}`);
    await runQuery(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );
    
    return { success: true, message: 'Contact and associated messages deleted successfully' };
  } catch (error) {
    console.error(`[CONTACT-SERVICE] Error deleting contact: ${error.message}`);
    throw error;
  }
};

// Find or create a contact by phone number
const findOrCreateContact = async (userId, phoneNumber) => {
  console.log(`[BACKEND-DEBUG] Finding or creating contact: userId=${userId}, phoneNumber=${phoneNumber}`);
  
  try {
    // Validate phone number format: 0 followed by 9 digits
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error('Phone number must be 0 followed by 9 digits');
    }
    
    // Check if contact already exists
    let contact = await getOne(
      'SELECT * FROM contacts WHERE user_id = ? AND phone_number = ?',
      [userId, phoneNumber]
    );
    
    if (contact) {
      console.log(`[BACKEND-DEBUG] Contact already exists: ${JSON.stringify(contact)}`);
      
      // If contact exists but has null contact_user_id, try to update it
      if (contact.contact_user_id === null) {
        console.log(`[BACKEND-DEBUG] Existing contact has null contact_user_id, attempting to update`);
        
        // Try to find the user by phone number
        const contactUser = await userService.findByPhoneNumber(phoneNumber);
        
        if (contactUser) {
          console.log(`[BACKEND-DEBUG] Found matching user: ${JSON.stringify(contactUser)}`);
          
          // Update the contact with the user ID
          await runQuery(
            'UPDATE contacts SET contact_user_id = ? WHERE id = ?',
            [contactUser.id, contact.id]
          );
          
          // Get the updated contact
          contact = await getOne(
            'SELECT * FROM contacts WHERE id = ?',
            [contact.id]
          );
          
          console.log(`[BACKEND-DEBUG] Updated contact: ${JSON.stringify(contact)}`);
        } else {
          console.log(`[BACKEND-DEBUG] No matching user found for phone number: ${phoneNumber}`);
        }
      }
      
      return contact;
    }
    
    // Log all users for debugging
    const allUsers = await getAll('SELECT id, username, phone_number FROM users', []);
    console.log(`[BACKEND-DEBUG] All users in database:`, allUsers);
    
    // Check if the phone number belongs to a registered user
    const contactUser = await userService.findByPhoneNumber(phoneNumber);
    
    if (contactUser) {
      console.log(`[BACKEND-DEBUG] Found user for contact: ${JSON.stringify(contactUser)}`);
    } else {
      console.log(`[BACKEND-DEBUG] No user found with phone number: ${phoneNumber}`);
    }
    
    const contactUserId = contactUser ? contactUser.id : null;
    console.log(`[BACKEND-DEBUG] Using contact_user_id=${contactUserId} for new contact`);
    
    // Create new contact
    const result = await runQuery(
      'INSERT INTO contacts (user_id, contact_user_id, phone_number, nickname) VALUES (?, ?, ?, ?)',
      [userId, contactUserId, phoneNumber, phoneNumber] // Using phone number as nickname by default
    );
    
    console.log(`[BACKEND-DEBUG] Created new contact with ID: ${result.lastID}`);
    
    // Get the created contact
    contact = await getOne(
      'SELECT * FROM contacts WHERE id = ?',
      [result.lastID]
    );
    
    console.log(`[BACKEND-DEBUG] New contact details: ${JSON.stringify(contact)}`);
    
    return contact;
  } catch (error) {
    console.error(`[BACKEND-ERROR] Error in findOrCreateContact: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  findOrCreateContact
}; 