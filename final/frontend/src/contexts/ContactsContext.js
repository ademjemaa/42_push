import React, { createContext, useState, useContext, useEffect } from 'react';
import { contactsAPI, authAPI } from '../services/api';
import { useAuth } from './AuthContext';
import contactsService from '../services/contactsService';
import deletedContactsCache from '../services/DeletedContactsCache';
// Add EventEmitter for cross-context communication
import { EventRegister } from 'react-native-event-listeners';

// Create Contacts Context
export const ContactsContext = createContext();

// Contacts Context Provider
export const ContactsProvider = ({ children }) => {
  const { userToken, userId } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Create a reference to track last fetch time to prevent too frequent refreshes
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Initialize the deleted contacts cache on mount
  useEffect(() => {
    const initCache = async () => {
      try {
        await contactsService.initDeletedContactsCache();
      } catch (error) {
        console.error('Failed to initialize deleted contacts cache:', error);
      }
    };
    
    initCache();
  }, []);
  
  // Listen for contact change events from other contexts
  useEffect(() => {
    const listener = EventRegister.addEventListener('contactsChanged', (data) => {
      console.log('[CONTACTS] Received contactsChanged event:', data);
      
      // Debounce fetch calls by checking last fetch time
      const now = Date.now();
      if (now - lastFetchTime > 2000) { // Only refresh if it's been more than 2 seconds
        console.log('[CONTACTS] Refreshing contacts due to contactsChanged event');
        fetchContacts();
      } else {
        console.log('[CONTACTS] Ignoring contactsChanged event due to debounce');
        
        // Schedule a refresh after debounce period
        setTimeout(() => {
          console.log('[CONTACTS] Performing delayed refresh after contactsChanged event');
          fetchContacts();
        }, 2500);
      }
    });
    
    // Cleanup listener on unmount
    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, [lastFetchTime]); // Include lastFetchTime in dependencies
  
  // Fetch contacts whenever userToken changes
  useEffect(() => {
    if (userToken) {
      fetchContacts();
    } else {
      setContacts([]);
    }
  }, [userToken]);
  
  // Fetch all contacts
  const fetchContacts = async () => {
    if (!userToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Update last fetch time
      setLastFetchTime(Date.now());
      
      const data = await contactsAPI.getAllContacts();
      
      // Load user avatars for contacts that have a user ID
      for (const contact of data) {
        if (contact.contact_user_id) {
          // Try to fetch user avatar for this contact - no try/catch needed
          // as getUserAvatar now returns null on failure
          const avatarBase64 = await authAPI.getUserAvatar(contact.contact_user_id);
          if (avatarBase64) {
            contact.user_avatar = avatarBase64;
          }
        }
      }
      
      setContacts(data);
      console.log(`[CONTACTS] Successfully fetched ${data.length} contacts`);
    } catch (e) {
      setError(e.message);
      console.error('Failed to fetch contacts:', e);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get a contact by ID
  const getContactById = async (contactId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if the contact is marked as deleted
      if (await contactsService.checkContactExists(contactId) === false) {
        console.log(`[CONTACTS] Contact ID ${contactId} does not exist or was deleted`);
        // Set error but don't show it in UI
        setError('contact_deleted');
        return null;
      }
      
      const contact = await contactsAPI.getContactById(contactId);
      
      // If the contact has a user ID, try to get their avatar
      if (contact.contact_user_id) {
        // No try/catch needed as getUserAvatar now returns null on failure
        const avatarBase64 = await authAPI.getUserAvatar(contact.contact_user_id);
        if (avatarBase64) {
          contact.user_avatar = avatarBase64;
        }
      }
      
      return contact;
    } catch (e) {
      // Only set visible error for non-deletion errors
      if (e.message && e.message.includes('not found')) {
        // For deleted contacts, use a special error code but don't show it in UI
        setError('contact_deleted');
        await deletedContactsCache.markAsDeleted(contactId);
        console.log(`[CONTACTS] Contact ID ${contactId} added to deleted cache`);
      } else {
        // Only show real errors to the user
        setError(e.message);
        console.error('[CONTACTS] Error fetching contact:', e);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new contact
  const createContact = async (contactData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if there's a deleted contact with the same phone number
      // and remove it from the deleted cache
      if (contactData.phone_number) {
        console.log(`[CONTACTS] Cleaning up any deleted contacts with phone number: ${contactData.phone_number}`);
        await contactsService.cleanupDeletedContactsByPhone(contactData.phone_number);
      }
      
      const newContact = await contactsAPI.createContact(contactData);
      
      // Remove from deleted contacts cache if it was there previously
      console.log(`[CONTACTS] New contact created with ID: ${newContact.id}. Removing from deleted cache if present.`);
      await deletedContactsCache.unmarkAsDeleted(newContact.id);
      
      // If the new contact has a user ID, try to get their avatar
      if (newContact.contact_user_id) {
        // No try/catch needed as getUserAvatar now returns null on failure
        const avatarBase64 = await authAPI.getUserAvatar(newContact.contact_user_id);
        if (avatarBase64) {
          newContact.user_avatar = avatarBase64;
        }
      }
      
      // Update contacts list
      setContacts(prevContacts => [...prevContacts, newContact]);
      
      return newContact;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update a contact
  const updateContact = async (contactId, contactData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Client-side validation for nickname
      if (contactData.nickname !== undefined) {
        if (contactData.nickname === null || contactData.nickname.trim() === '') {
          throw new Error('Nickname cannot be empty');
        }
      }
      
      const updatedContact = await contactsAPI.updateContact(contactId, contactData);
      
      // If the updated contact has a user ID, try to get their avatar
      if (updatedContact.contact_user_id) {
        // No try/catch needed as getUserAvatar now returns null on failure
        const avatarBase64 = await authAPI.getUserAvatar(updatedContact.contact_user_id);
        if (avatarBase64) {
          updatedContact.user_avatar = avatarBase64;
        }
      }
      
      // Update contacts list
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === contactId ? updatedContact : contact
        )
      );
      
      return updatedContact;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a contact
  const deleteContact = async (contactId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the contactsService to delete and mark as deleted in cache
      await contactsService.deleteContact(contactId);
      
      // Update contacts list
      setContacts(prevContacts => 
        prevContacts.filter(contact => contact.id !== contactId)
      );
      
      console.log(`[CONTACTS] Successfully deleted contact ID ${contactId} and updated cache`);
      return true;
    } catch (e) {
      // Special handling for "not found" errors - still count as success
      if (e.message && e.message.includes('not found')) {
        // Still update local state and mark as deleted
        setContacts(prevContacts => 
          prevContacts.filter(contact => contact.id !== contactId)
        );
        await deletedContactsCache.markAsDeleted(contactId);
        console.log(`[CONTACTS] Contact ID ${contactId} not found but still marked as deleted in cache`);
        return true;
      }
      
      // Only set error for real errors
      setError(e.message);
      console.error('[CONTACTS] Error deleting contact:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Block a contact
  const blockContact = async (contactId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedContact = await contactsAPI.blockContact(contactId);
      
      // Update contacts list
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === contactId ? { ...contact, is_blocked: true } : contact
        )
      );
      
      return updatedContact;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Unblock a contact
  const unblockContact = async (contactId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedContact = await contactsAPI.unblockContact(contactId);
      
      // Update contacts list
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === contactId ? { ...contact, is_blocked: false } : contact
        )
      );
      
      return updatedContact;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Find or get contact that matches phone number
  const findContactByPhoneNumber = (phoneNumber) => {
    return contacts.find(contact => contact.phone_number === phoneNumber) || null;
  };
  
  // Get user avatar for a contact (by contact_user_id)
  const getContactUserAvatar = async (contactUserId) => {
    if (!contactUserId) return null;
    // Simply return the result, which will be null if there's an error
    return await authAPI.getUserAvatar(contactUserId);
  };
  
  // Contacts context value
  const contactsContext = {
    contacts,
    isLoading,
    error,
    fetchContacts,
    getContactById,
    createContact,
    updateContact,
    deleteContact,
    blockContact,
    unblockContact,
    findContactByPhoneNumber,
    getContactUserAvatar
  };
  
  return (
    <ContactsContext.Provider value={contactsContext}>
      {children}
    </ContactsContext.Provider>
  );
};

// Contacts Context Hook
export const useContacts = () => {
  const context = useContext(ContactsContext);
  
  if (!context) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  
  return context;
}; 