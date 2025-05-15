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
    // Get the contact's phone number before deleting
    let phoneNumber = null;
    try {
      const contact = await contactsAPI.getContactById(contactId);
      phoneNumber = contact?.phone_number;
      console.log(`[CONTACTS-SERVICE] Got phone number ${phoneNumber} for contact ID ${contactId} before deletion`);
    } catch (error) {
      console.log(`[CONTACTS-SERVICE] Couldn't get phone number for contact ID ${contactId} before deletion:`, error.message);
    }
    
    // Delete the contact using the API
    await contactsAPI.deleteContact(contactId);
    
    // Mark as deleted in the cache, including phone number if available
    await deletedContactsCache.markAsDeleted(contactId, phoneNumber);
    
    console.log(`[CONTACTS-SERVICE] Successfully deleted contact ID ${contactId} (phone: ${phoneNumber || 'unknown'}) and added to cache`);
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

// Remove contact ID from deleted cache
export const removeFromDeletedCache = async (contactId) => {
  if (!contactId) return;
  
  await deletedContactsCache.unmarkAsDeleted(contactId);
  console.log(`[CONTACTS-SERVICE] Removed contact ID ${contactId} from deleted cache`);
};

// Check if any deleted contact has the given phone number and remove it from cache
export const cleanupDeletedContactsByPhone = async (phoneNumber) => {
  try {
    if (!phoneNumber) return;
    
    console.log(`[CONTACTS-SERVICE] Looking for deleted contacts with phone number: ${phoneNumber}`);
    
    // Check if this phone number is directly in the deleted cache
    if (deletedContactsCache.isPhoneDeleted(phoneNumber)) {
      // Get the contact ID for this phone number
      const contactId = deletedContactsCache.getContactIdByPhone(phoneNumber);
      
      console.log(`[CONTACTS-SERVICE] Found deleted contact with ID ${contactId} that has phone ${phoneNumber}, removing from cache`);
      await deletedContactsCache.unmarkPhoneAsDeleted(phoneNumber);
      return;
    }
    
    // Use the old method as fallback for contacts that were deleted before this update
    // Get all deleted contact IDs
    const deletedIds = deletedContactsCache.getAll();
    if (!deletedIds.length) {
      return; // No deleted contacts to check
    }
    
    // For each deleted ID, check if it has the same phone number
    const allContacts = await contactsAPI.getAllContacts();
    const deletedContact = allContacts.find(contact => 
      contact.phone_number === phoneNumber && 
      deletedIds.includes(contact.id.toString())
    );
    
    if (deletedContact) {
      console.log(`[CONTACTS-SERVICE] Found deleted contact with ID ${deletedContact.id} that has phone ${phoneNumber}, removing from cache`);
      await deletedContactsCache.unmarkAsDeleted(deletedContact.id);
    }
  } catch (error) {
    console.error('[CONTACTS-SERVICE] Error cleaning up deleted contacts by phone:', error);
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
  initDeletedContactsCache,
  removeFromDeletedCache,
  cleanupDeletedContactsByPhone
}; 