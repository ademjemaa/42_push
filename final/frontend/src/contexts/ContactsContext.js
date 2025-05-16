import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
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
  
  // Get Redux store to access state directly
  const store = useStore();
  const getState = () => store.getState();
  
  // Get contacts data from Redux store
  const contacts = useSelector(selectAllContacts);
  const status = useSelector(selectContactsStatus);
  const error = useSelector(selectContactsError);
  const isLoading = status === 'loading';
  
  // Listen for contact change events from other contexts
  useEffect(() => {
    const listener = EventRegister.addEventListener('contactsChanged', (data) => {
      console.log('[CONTACTS] Received contactsChanged event:', data);
      
      fetchContacts();
    });
    
    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []); 
  
  useEffect(() => {
    if (userToken) {
      fetchContacts();
    }
  }, [userToken]);
  
  const fetchContacts = async () => {
    if (!userToken) return;
    
    try {
      await dispatch(fetchContactsAction()).unwrap();
      console.log(`[CONTACTS] Successfully fetched contacts using Redux`);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };
  
  const getContactById = async (contactId) => {
    try {
      const existingContact = selectContactById(getState(), contactId);
      
      if (existingContact === undefined || existingContact === null) {
        console.log(`[CONTACTS] Contact ID ${contactId} not found in state, will check API`);
      }
      
      const exists = await contactsService.checkContactExists(contactId);
      if (exists === false) {
        console.log(`[CONTACTS] Contact ID ${contactId} does not exist or was deleted`);
        
        dispatch(deleteContactAction(contactId));
        return null;
      }
      
      const result = await dispatch(getContactByIdAction(contactId)).unwrap();
      return result;
    } catch (error) {
      console.error('[CONTACTS] Error fetching contact:', error);
      
      if (error.message && (
        error.message.includes('not found') || 
        error.message.includes('Contact not found')
      )) {
        dispatch(deleteContactAction(contactId));
      }
      
      return null;
    }
  };
  
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
  
  const deleteContact = async (contactId) => {
    try {
      try {
        const exists = await contactsService.checkContactExists(contactId);
        if (!exists) {
          console.log(`[CONTACTS] Contact ID ${contactId} already deleted or does not exist`);
          
          // Remove from Redux state anyway to ensure consistency
          await dispatch(deleteContactAction(contactId)).unwrap();
          
          return true;
        }
      } catch (checkError) {
        console.log(`[CONTACTS] Error checking if contact exists, will try to delete anyway:`, checkError);
      }
      
      try {
        await contactsService.deleteContact(contactId);
      } catch (serviceError) {
        if (serviceError.message && serviceError.message.includes('not found')) {
          console.log(`[CONTACTS] Contact ID ${contactId} was not found on delete (already deleted)`);
        } else {
          console.error('[CONTACTS] Error deleting contact from server:', serviceError);
        }
      }
      
      await dispatch(deleteContactAction(contactId)).unwrap();
      
      console.log(`[CONTACTS] Successfully deleted contact ID ${contactId}`);
      return true;
    } catch (error) {
      console.error('[CONTACTS] Error in deleteContact function:', error);
      
      try {
        dispatch(deleteContactAction(contactId));
      } catch (reduxError) {
        console.error('[CONTACTS] Could not clean up Redux state:', reduxError);
      }
      
      throw error;
    }
  };
  
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
  
  const findContactByPhoneNumber = (phoneNumber) => {
    return contacts.find(contact => contact.phone_number === phoneNumber);
  };
  
  const getContactUserAvatar = async (contactUserId) => {
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

  const notifyContactsChanged = () => {
    EventRegister.emit('contactsChanged', { source: 'contacts' });
  };
  
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

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
}; 