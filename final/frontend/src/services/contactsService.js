import { contactsAPI } from './api';
import deletedContactsCache from './DeletedContactsCache';

// Get a contact by ID with error handling and debug logging
export const getContactById = async (contactId) => {
  try {
    // First check if this contact is in the deleted cache
    if (deletedContactsCache.isDeleted(contactId)) {
      console.log(`[CONTACTS-SERVICE] Contact ID ${contactId} is in deleted cache, skipping API call`);
      return null;
    }
    
    console.log('[CONTACTS-SERVICE] Fetching contact details for ID:', contactId);
    const contact = await contactsAPI.getContactById(contactId);
    console.log('[CONTACTS-SERVICE] Contact details retrieved:', 
      contact ? `ID: ${contact.id}, User ID: ${contact.user_id}, Phone: ${contact.phone_number}` : 'No contact found'
    );
    return contact;
  } catch (error) {
    // Don't log as error if it's just a "not found" error which is expected
    if (error.message && error.message.includes('not found')) {
      console.log(`[CONTACTS-SERVICE] Contact ID ${contactId} not found, adding to deleted cache`);
      await deletedContactsCache.markAsDeleted(contactId);
    } else {
      console.error('[CONTACTS-SERVICE] Error fetching contact:', error);
    }
    
    return null;
  }
};

// Find a contact by user ID
export const findContactByUserId = async (userId) => {
  try {
    console.log('[CONTACTS-SERVICE] Finding contact with user ID:', userId);
    const allContacts = await contactsAPI.getAllContacts();
    
    const contact = allContacts.find(c => c.user_id === userId);
    console.log('[CONTACTS-SERVICE] Contact search result:', 
      contact ? `ID: ${contact.id}, User ID: ${contact.user_id}, Phone: ${contact.phone_number}` : 'No contact found'
    );
    
    return contact;
  } catch (error) {
    console.error('[CONTACTS-SERVICE] Error finding contact by user ID:', error);
    return null;
  }
};

// Find a contact by contact_user_id (the actual user the contact represents)
export const findContactByContactUserId = async (contactUserId) => {
  try {
    console.log('[CONTACTS-SERVICE] Finding contact that represents user ID:', contactUserId);
    const allContacts = await contactsAPI.getAllContacts();
    
    const contact = allContacts.find(c => 
      c.contact_user_id && c.contact_user_id.toString() === contactUserId.toString()
    );
    
    console.log('[CONTACTS-SERVICE] Contact search result:', 
      contact ? `ID: ${contact.id}, Represents user: ${contact.contact_user_id}, Phone: ${contact.phone_number}` : 'No contact found'
    );
    
    return contact;
  } catch (error) {
    console.error('[CONTACTS-SERVICE] Error finding contact by contact_user_id:', error);
    return null;
  }
};

// Add a function to find a contact by phone number
export const findContactByPhoneNumber = async (phoneNumber) => {
  try {
    console.log('[CONTACTS-SERVICE] Finding contact with phone number:', phoneNumber);
    
    // Get all contacts first
    const allContacts = await contactsAPI.getAllContacts();
    
    const contact = allContacts.find(c => c.phone_number === phoneNumber);
    console.log('[CONTACTS-SERVICE] Contact search result by phone number:', 
      contact ? `ID: ${contact.id}, User ID: ${contact.user_id}, Phone: ${contact.phone_number}` : 'No contact found'
    );
    
    return contact;
  } catch (error) {
    console.error('[CONTACTS-SERVICE] Error finding contact by phone number:', error);
    return null;
  }
};

// Check if a contact still exists
export const checkContactExists = async (contactId) => {
  try {
    // First check the deleted contacts cache
    if (deletedContactsCache.isDeleted(contactId)) {
      console.log(`[CONTACTS-SERVICE] Contact ID ${contactId} is in deleted cache, returning false`);
      return false;
    }
    
    const contact = await contactsAPI.getContactById(contactId);
    return !!contact; // Returns true if contact exists, false otherwise
  } catch (error) {
    // If we get an error like "Contact not found", return false
    if (error.message && error.message.includes('not found')) {
      console.log(`[CONTACTS-SERVICE] Contact ID ${contactId} confirmed not to exist`);
      
      // Add to deleted cache
      await deletedContactsCache.markAsDeleted(contactId);
      
      return false;
    }
    
    // For other errors, log and still return false to be safe
    console.error(`[CONTACTS-SERVICE] Error checking if contact exists:`, error);
    return false;
  }
};

// Delete a contact and add it to the deleted cache
export const deleteContact = async (contactId) => {
  try {
    // Delete the contact using the API
    await contactsAPI.deleteContact(contactId);
    
    // Mark as deleted in the cache
    await deletedContactsCache.markAsDeleted(contactId);
    
    console.log(`[CONTACTS-SERVICE] Successfully deleted contact ID ${contactId} and added to cache`);
    return true;
  } catch (error) {
    console.error(`[CONTACTS-SERVICE] Error deleting contact:`, error);
    
    // If it's a not found error, still mark it as deleted in the cache
    if (error.message && error.message.includes('not found')) {
      await deletedContactsCache.markAsDeleted(contactId);
    }
    
    throw error;
  }
};

// Initialize the deleted contacts cache
export const initDeletedContactsCache = async () => {
  try {
    await deletedContactsCache.init();
    console.log('[CONTACTS-SERVICE] Initialized deleted contacts cache');
    return true;
  } catch (error) {
    console.error('[CONTACTS-SERVICE] Error initializing deleted contacts cache:', error);
    return false;
  }
};

// Export default for module imports
export default {
  getContactById,
  findContactByUserId,
  findContactByContactUserId,
  findContactByPhoneNumber,
  checkContactExists,
  deleteContact,
  initDeletedContactsCache
}; 