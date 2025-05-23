import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contactsAPI, authAPI } from '../../services/api';

// Async thunks
export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (_, { rejectWithValue }) => {
    try {
      const contacts = await contactsAPI.getAllContacts();
      
      for (const contact of contacts) {
        if (contact.contact_user_id) {
          const avatarBase64 = await authAPI.getUserAvatar(contact.contact_user_id);
          if (avatarBase64) {
            contact.user_avatar = avatarBase64;
          }
        }
      }
      
      return contacts;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getContactById = createAsyncThunk(
  'contacts/getContactById',
  async (contactId, { rejectWithValue }) => {
    try {
      const contact = await contactsAPI.getContactById(contactId);
      
      if (contact.contact_user_id) {
        const avatarBase64 = await authAPI.getUserAvatar(contact.contact_user_id);
        if (avatarBase64) {
          contact.user_avatar = avatarBase64;
        }
      }
      
      return contact;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData, { rejectWithValue }) => {
    try {
      const newContact = await contactsAPI.createContact(contactData);
      
      if (newContact.contact_user_id) {
        const avatarBase64 = await authAPI.getUserAvatar(newContact.contact_user_id);
        if (avatarBase64) {
          newContact.user_avatar = avatarBase64;
        }
      }
      
      return newContact;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ contactId, contactData }, { rejectWithValue }) => {
    try {
      const updatedContact = await contactsAPI.updateContact(contactId, contactData);
      
      if (updatedContact.contact_user_id) {
        const avatarBase64 = await authAPI.getUserAvatar(updatedContact.contact_user_id);
        if (avatarBase64) {
          updatedContact.user_avatar = avatarBase64;
        }
      }
      
      return updatedContact;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (contactId, { rejectWithValue }) => {
    try {
      await contactsAPI.deleteContact(contactId);
      return contactId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    currentContact: null,
  },
  reducers: {
    contactAdded: (state, action) => {
      const newContact = action.payload;
      if (!state.items.find(contact => contact.id === newContact.id)) {
        state.items.push(newContact);
      }
    },
    contactUpdated: (state, action) => {
      const updatedContact = action.payload;
      const index = state.items.findIndex(contact => contact.id === updatedContact.id);
      if (index !== -1) {
        state.items[index] = updatedContact;
      }
    },
    contactDeleted: (state, action) => {
      const contactId = action.payload;
      state.items = state.items.filter(contact => contact.id !== contactId);
    },
    // Update the last message of a contact
    updateContactLastMessage: (state, action) => {
      const { contactId, message } = action.payload;
      const index = state.items.findIndex(contact => contact.id === contactId);
      if (index !== -1) {
        state.items[index].lastMessage = message;
      }
    },
    clearContacts: (state) => {
      state.items = [];
      state.currentContact = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchContacts
      .addCase(fetchContacts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Handle getContactById
      .addCase(getContactById.fulfilled, (state, action) => {
        state.currentContact = action.payload;
        
        const index = state.items.findIndex(contact => contact.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      
      // Handle createContact
      .addCase(createContact.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      
      // Handle updateContact
      .addCase(updateContact.fulfilled, (state, action) => {
        const index = state.items.findIndex(contact => contact.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        
        if (state.currentContact && state.currentContact.id === action.payload.id) {
          state.currentContact = action.payload;
        }
      })
      
      // Handle deleteContact
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.items = state.items.filter(contact => contact.id !== action.payload);
        
        if (state.currentContact && state.currentContact.id === action.payload) {
          state.currentContact = null;
        }
      });
  },
});

export const { contactAdded, contactUpdated, contactDeleted, updateContactLastMessage, clearContacts } = contactsSlice.actions;
export default contactsSlice.reducer;

export const selectAllContacts = (state) => state.contacts.items;
export const selectContactById = (state, contactId) => 
  state.contacts.items.find(contact => contact.id === contactId);
export const selectContactsStatus = (state) => state.contacts.status;
export const selectContactsError = (state) => state.contacts.error; 