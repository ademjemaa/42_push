import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from './AuthContext';
import contactsService from '../services/contactsService';
import { EventRegister } from 'react-native-event-listeners';

// Import Redux actions and selectors
import {
  fetchContacts as fetchContactsAction,
  getContactById as getContactByIdAction,
  createContact as createContactAction,
  updateContact as updateContactAction,
  deleteContact as deleteContactAction,
  selectAllContacts,
  selectContactById,
  selectContactsStatus,
  selectContactsError
} from '../redux/slices/contactsSlice';

// Create Contacts Context
export const ContactsContext = createContext();

// Contacts Context Provider
export const ContactsProvider = ({ children }) => {
  const { userToken, userId } = useAuth();
  const dispatch = useDispatch();
  
  // Get contacts data from Redux store
  const contacts = useSelector(selectAllContacts);
  const status = useSelector(selectContactsStatus);
  const error = useSelector(selectContactsError);
  const isLoading = status === 'loading';
  
  // Listen for contact change events from other contexts
  useEffect(() => {
    const listener = EventRegister.addEventListener('contactsChanged', (data) => {
      console.log('[CONTACTS] Received contactsChanged event:', data);
      
      // Fetch contacts using Redux action
      fetchContacts();
    });
    
    // Cleanup listener on unmount
    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []); 
  
  // Fetch contacts whenever userToken changes
  useEffect(() => {
    if (userToken) {
      fetchContacts();
    }
  }, [userToken]);
  
  // Fetch all contacts using Redux
  const fetchContacts = async () => {
    if (!userToken) return;
    
    try {
      await dispatch(fetchContactsAction()).unwrap();
      console.log(`[CONTACTS] Successfully fetched contacts using Redux`);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };
  
  // Get a contact by ID using Redux
  const getContactById = async (contactId) => {
    try {
      // First check if the contact exists
      if (await contactsService.checkContactExists(contactId) === false) {
        console.log(`[CONTACTS] Contact ID ${contactId} does not exist or was deleted`);
        return null;
      }
      
      const result = await dispatch(getContactByIdAction(contactId)).unwrap();
      return result;
    } catch (error) {
      console.error('[CONTACTS] Error fetching contact:', error);
      return null;
    }
  };
  
  // Create a new contact using Redux
  const createContact = async (contactData) => {
    try {
      const newContact = await dispatch(createContactAction(contactData)).unwrap();
      console.log(`[CONTACTS] New contact created with ID: ${newContact.id}`);
      return newContact;
    } catch (error) {
      console.error('[CONTACTS] Error creating contact:', error);
      throw error;
    }
  };
  
  // Update a contact using Redux
  const updateContact = async (contactId, contactData) => {
    try {
      // Client-side validation for nickname
      if (contactData.nickname !== undefined) {
        if (contactData.nickname === null || contactData.nickname.trim() === '') {
          throw new Error('Nickname cannot be empty');
        }
      }
      
      const updatedContact = await dispatch(updateContactAction({ contactId, contactData })).unwrap();
      
      return updatedContact;
    } catch (error) {
      console.error('[CONTACTS] Error updating contact:', error);
      throw error;
    }
  };
  
  // Delete a contact using Redux
  const deleteContact = async (contactId) => {
    try {
      // Delete with contactsService
      await contactsService.deleteContact(contactId);
      
      // Dispatch Redux action
      await dispatch(deleteContactAction(contactId)).unwrap();
      
      console.log(`[CONTACTS] Successfully deleted contact ID ${contactId}`);
      return true;
    } catch (error) {
      console.error('[CONTACTS] Error deleting contact:', error);
      throw error;
    }
  };
  
  // Block a contact
  const blockContact = async (contactId) => {
    try {
      const updatedContact = await updateContact(contactId, { is_blocked: true });
      console.log(`[CONTACTS] Successfully blocked contact ID ${contactId}`);
      return updatedContact;
    } catch (error) {
      console.error('[CONTACTS] Error blocking contact:', error);
      throw error;
    }
  };
  
  // Unblock a contact
  const unblockContact = async (contactId) => {
    try {
      const updatedContact = await updateContact(contactId, { is_blocked: false });
      console.log(`[CONTACTS] Successfully unblocked contact ID ${contactId}`);
      return updatedContact;
    } catch (error) {
      console.error('[CONTACTS] Error unblocking contact:', error);
      throw error;
    }
  };
  
  // Find a contact by phone number
  const findContactByPhoneNumber = (phoneNumber) => {
    return contacts.find(contact => contact.phone_number === phoneNumber);
  };
  
  // Get a contact's avatar
  const getContactUserAvatar = async (contactUserId) => {
    // Replace the require statements with try/catch
    let authAPI = null;
    try {
      const api = require('../services/api');
      authAPI = api.authAPI;
    } catch (error) {
      console.error('Error loading API:', error);
    }
    
    if (!authAPI) return null;
    
    try {
      const avatarBase64 = await authAPI.getUserAvatar(contactUserId);
      return avatarBase64;
    } catch (error) {
      console.error('[CONTACTS] Error fetching contact avatar:', error);
      return null;
    }
  };

  // Notify other contexts that contacts have changed
  const notifyContactsChanged = () => {
    EventRegister.emit('contactsChanged', { source: 'contacts' });
  };
  
  // Provide the same interface to components, but now using Redux under the hood
  const contextValue = {
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
    getContactUserAvatar,
    notifyContactsChanged,
  };

  return (
    <ContactsContext.Provider value={contextValue}>
      {children}
    </ContactsContext.Provider>
  );
};

// Custom hook for using contacts
export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
}; 