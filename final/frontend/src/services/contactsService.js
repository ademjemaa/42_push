import { contactsAPI } from './api';

export const getContactById = async (contactId) => {
  try {
    console.log('[CONTACTS-SERVICE] Fetching contact details for ID:', contactId);
    const contact = await contactsAPI.getContactById(contactId);
    console.log('[CONTACTS-SERVICE] Contact details retrieved:', 
      contact ? `ID: ${contact.id}, User ID: ${contact.user_id}, Phone: ${contact.phone_number}` : 'No contact found'
    );
    return contact;
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      console.log(`[CONTACTS-SERVICE] Contact ID ${contactId} not found`);
    } else {
      console.error('[CONTACTS-SERVICE] Error fetching contact:', error);
    }
    
    return null;
  }
};

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

export const findContactByPhoneNumber = async (phoneNumber) => {
  try {
    console.log('[CONTACTS-SERVICE] Finding contact with phone number:', phoneNumber);
    
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

export const checkContactExists = async (contactId) => {
  try {
    const contact = await contactsAPI.getContactById(contactId);
    return !!contact; // Returns true if contact exists, false otherwise
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      console.log(`[CONTACTS-SERVICE] Contact ID ${contactId} confirmed not to exist`);
      return false;
    }
    
    console.error(`[CONTACTS-SERVICE] Error checking if contact exists:`, error);
    return false;
  }
};

// Delete a contact
export const deleteContact = async (contactId) => {
  try {
    try {
      const exists = await checkContactExists(contactId);
      if (!exists) {
        console.log(`[CONTACTS-SERVICE] Contact ID ${contactId} doesn't exist, skipping deletion`);
        return true; 
      }
    } catch (checkError) {
      console.log(`[CONTACTS-SERVICE] Error checking contact existence:`, checkError);
    }
    
    await contactsAPI.deleteContact(contactId);
    console.log(`[CONTACTS-SERVICE] Successfully deleted contact ID ${contactId}`);
    return true;
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      console.log(`[CONTACTS-SERVICE] Contact ID ${contactId} not found on delete (already deleted)`);
      return true; 
    }
    
    console.error(`[CONTACTS-SERVICE] Error deleting contact:`, error);
    throw error;
  }
};

export default {
  getContactById,
  findContactByUserId,
  findContactByContactUserId,
  findContactByPhoneNumber,
  checkContactExists,
  deleteContact
}; 