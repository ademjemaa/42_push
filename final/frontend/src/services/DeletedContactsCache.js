import AsyncStorage from '@react-native-async-storage/async-storage';

const DELETED_CONTACTS_KEY = 'deletedContacts';
const DELETED_PHONES_KEY = 'deletedPhones';

/**
 * A utility class to track and persist deleted contact IDs.
 * This helps prevent unnecessary API calls for contacts we know are deleted.
 */
class DeletedContactsCache {
  constructor() {
    this.deletedContacts = new Set();
    this.phoneToContactId = new Map(); // Map of phone numbers to contact IDs
    this.contactIdToPhone = new Map(); // Map of contact IDs to phone numbers
    this.initialized = false;
  }

  /**
   * Initialize the cache by loading deleted contacts from AsyncStorage
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Load deleted contact IDs
      const storedIds = await AsyncStorage.getItem(DELETED_CONTACTS_KEY);
      if (storedIds) {
        const contactIds = JSON.parse(storedIds);
        this.deletedContacts = new Set(contactIds);
        console.log(`[CONTACTS-CACHE] Loaded ${this.deletedContacts.size} deleted contact IDs from storage`);
      } else {
        console.log('[CONTACTS-CACHE] No deleted contacts found in storage');
      }
      
      // Load deleted phone mappings
      const storedPhones = await AsyncStorage.getItem(DELETED_PHONES_KEY);
      if (storedPhones) {
        const phoneMappings = JSON.parse(storedPhones);
        
        // Rebuild the maps
        this.phoneToContactId = new Map();
        this.contactIdToPhone = new Map();
        
        for (const [contactId, phoneNumber] of Object.entries(phoneMappings)) {
          if (phoneNumber) {
            this.phoneToContactId.set(phoneNumber, contactId);
            this.contactIdToPhone.set(contactId, phoneNumber);
          }
        }
        
        console.log(`[CONTACTS-CACHE] Loaded ${this.phoneToContactId.size} phone number mappings`);
      } else {
        console.log('[CONTACTS-CACHE] No phone mappings found in storage');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('[CONTACTS-CACHE] Error loading deleted contacts from storage:', error);
    }
  }
  
  /**
   * Check if a contact has been deleted
   * @param {string|number} contactId - The ID of the contact to check
   * @returns {boolean} True if the contact has been marked as deleted
   */
  isDeleted(contactId) {
    if (!contactId) return false;
    return this.deletedContacts.has(contactId.toString());
  }
  
  /**
   * Check if a phone number belongs to a deleted contact
   * @param {string} phoneNumber - The phone number to check
   * @returns {boolean} True if the phone number belongs to a deleted contact
   */
  isPhoneDeleted(phoneNumber) {
    if (!phoneNumber) return false;
    return this.phoneToContactId.has(phoneNumber);
  }
  
  /**
   * Get the contact ID associated with a deleted phone number
   * @param {string} phoneNumber - The phone number to look up
   * @returns {string|null} The contact ID if found, null otherwise
   */
  getContactIdByPhone(phoneNumber) {
    if (!phoneNumber) return null;
    return this.phoneToContactId.get(phoneNumber) || null;
  }
  
  /**
   * Mark a contact as deleted
   * @param {string|number} contactId - The ID of the contact to mark as deleted
   * @param {string} phoneNumber - Optional phone number associated with the contact
   */
  async markAsDeleted(contactId, phoneNumber = null) {
    if (!contactId) return;
    
    // Ensure the cache is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    const id = contactId.toString();
    let cacheChanged = false;
    
    // Add to deleted contacts set
    if (!this.deletedContacts.has(id)) {
      this.deletedContacts.add(id);
      cacheChanged = true;
    }
    
    // Store phone mapping if provided
    if (phoneNumber) {
      this.phoneToContactId.set(phoneNumber, id);
      this.contactIdToPhone.set(id, phoneNumber);
      cacheChanged = true;
      console.log(`[CONTACTS-CACHE] Associated phone ${phoneNumber} with deleted contact ID ${id}`);
    }
    
    if (cacheChanged) {
      console.log(`[CONTACTS-CACHE] Marked contact ID ${id} as deleted`);
      await this._persistCache();
    }
  }
  
  /**
   * Mark multiple contacts as deleted
   * @param {Array<string|number>} contactIds - Array of contact IDs to mark as deleted
   */
  async markMultipleAsDeleted(contactIds) {
    if (!contactIds || !contactIds.length) return;
    
    // Ensure the cache is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    let changed = false;
    for (const contactId of contactIds) {
      const id = contactId.toString();
      if (!this.deletedContacts.has(id)) {
        this.deletedContacts.add(id);
        changed = true;
      }
    }
    
    if (changed) {
      console.log(`[CONTACTS-CACHE] Marked ${contactIds.length} contacts as deleted`);
      await this._persistCache();
    }
  }
  
  /**
   * Remove a contact from the deleted cache (if it was recreated)
   * @param {string|number} contactId - The ID of the contact to unmark
   */
  async unmarkAsDeleted(contactId) {
    if (!contactId) return;
    
    // Ensure the cache is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    const id = contactId.toString();
    let cacheChanged = false;
    
    // Remove from deleted contacts set
    if (this.deletedContacts.has(id)) {
      this.deletedContacts.delete(id);
      cacheChanged = true;
    }
    
    // Remove phone mapping if exists
    if (this.contactIdToPhone.has(id)) {
      const phoneNumber = this.contactIdToPhone.get(id);
      this.phoneToContactId.delete(phoneNumber);
      this.contactIdToPhone.delete(id);
      cacheChanged = true;
      console.log(`[CONTACTS-CACHE] Removed phone mapping ${phoneNumber} for contact ID ${id}`);
    }
    
    if (cacheChanged) {
      console.log(`[CONTACTS-CACHE] Unmarked contact ID ${id} as deleted`);
      await this._persistCache();
    }
  }
  
  /**
   * Remove a phone number from the deleted cache
   * @param {string} phoneNumber - The phone number to remove
   */
  async unmarkPhoneAsDeleted(phoneNumber) {
    if (!phoneNumber) return;
    
    // Ensure the cache is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if this phone number exists in the cache
    if (this.phoneToContactId.has(phoneNumber)) {
      const contactId = this.phoneToContactId.get(phoneNumber);
      
      // Remove from both maps and the deleted set
      this.phoneToContactId.delete(phoneNumber);
      this.contactIdToPhone.delete(contactId);
      this.deletedContacts.delete(contactId);
      
      console.log(`[CONTACTS-CACHE] Unmarked phone ${phoneNumber} (contact ID: ${contactId}) as deleted`);
      await this._persistCache();
    }
  }
  
  /**
   * Removes multiple contact IDs from the deleted cache
   * @param {Array<string|number>} contactIds - Array of contact IDs to remove from the deleted cache
   */
  async unmarkMultipleAsDeleted(contactIds) {
    if (!contactIds || !contactIds.length) return;
    
    // Ensure the cache is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    let changed = false;
    for (const contactId of contactIds) {
      const id = contactId.toString();
      if (this.deletedContacts.has(id)) {
        // Also remove phone mapping if it exists
        if (this.contactIdToPhone.has(id)) {
          const phoneNumber = this.contactIdToPhone.get(id);
          this.phoneToContactId.delete(phoneNumber);
          this.contactIdToPhone.delete(id);
        }
        
        this.deletedContacts.delete(id);
        changed = true;
      }
    }
    
    if (changed) {
      console.log(`[CONTACTS-CACHE] Unmarked ${contactIds.length} contacts from deleted cache`);
      await this._persistCache();
    }
  }
  
  /**
   * Clear all deleted contacts from the cache
   */
  async clearAll() {
    this.deletedContacts.clear();
    this.phoneToContactId.clear();
    this.contactIdToPhone.clear();
    console.log('[CONTACTS-CACHE] Cleared all deleted contacts from cache');
    await this._persistCache();
  }
  
  /**
   * Get all deleted contact IDs
   * @returns {Array<string>} Array of deleted contact IDs
   */
  getAll() {
    return Array.from(this.deletedContacts);
  }
  
  /**
   * Get all deleted phone numbers
   * @returns {Array<string>} Array of deleted phone numbers
   */
  getAllPhones() {
    return Array.from(this.phoneToContactId.keys());
  }
  
  /**
   * Persist the cache to AsyncStorage
   * @private
   */
  async _persistCache() {
    try {
      // Save contact IDs
      const contactIds = Array.from(this.deletedContacts);
      await AsyncStorage.setItem(DELETED_CONTACTS_KEY, JSON.stringify(contactIds));
      
      // Save phone mappings
      const phoneMappings = {};
      for (const [contactId, phoneNumber] of this.contactIdToPhone.entries()) {
        phoneMappings[contactId] = phoneNumber;
      }
      await AsyncStorage.setItem(DELETED_PHONES_KEY, JSON.stringify(phoneMappings));
      
      console.log(`[CONTACTS-CACHE] Persisted ${contactIds.length} deleted contact IDs and ${this.phoneToContactId.size} phone mappings to storage`);
    } catch (error) {
      console.error('[CONTACTS-CACHE] Error persisting deleted contacts to storage:', error);
    }
  }
}

// Create a singleton instance
const deletedContactsCache = new DeletedContactsCache();

// Export the singleton
export default deletedContactsCache; 