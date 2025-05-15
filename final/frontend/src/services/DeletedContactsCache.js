import AsyncStorage from '@react-native-async-storage/async-storage';

const DELETED_CONTACTS_KEY = 'deletedContacts';

/**
 * A utility class to track and persist deleted contact IDs.
 * This helps prevent unnecessary API calls for contacts we know are deleted.
 */
class DeletedContactsCache {
  constructor() {
    this.deletedContacts = new Set();
    this.initialized = false;
  }

  /**
   * Initialize the cache by loading deleted contacts from AsyncStorage
   */
  async init() {
    if (this.initialized) return;
    
    try {
      const stored = await AsyncStorage.getItem(DELETED_CONTACTS_KEY);
      if (stored) {
        const contactIds = JSON.parse(stored);
        this.deletedContacts = new Set(contactIds);
        console.log(`[CONTACTS-CACHE] Loaded ${this.deletedContacts.size} deleted contact IDs from storage`);
      } else {
        console.log('[CONTACTS-CACHE] No deleted contacts found in storage');
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
   * Mark a contact as deleted
   * @param {string|number} contactId - The ID of the contact to mark as deleted
   */
  async markAsDeleted(contactId) {
    if (!contactId) return;
    
    // Ensure the cache is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    const id = contactId.toString();
    if (!this.deletedContacts.has(id)) {
      this.deletedContacts.add(id);
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
    if (this.deletedContacts.has(id)) {
      this.deletedContacts.delete(id);
      console.log(`[CONTACTS-CACHE] Unmarked contact ID ${id} as deleted`);
      await this._persistCache();
    }
  }
  
  /**
   * Clear all deleted contacts from the cache
   */
  async clearAll() {
    this.deletedContacts.clear();
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
   * Persist the cache to AsyncStorage
   * @private
   */
  async _persistCache() {
    try {
      const contactIds = Array.from(this.deletedContacts);
      await AsyncStorage.setItem(DELETED_CONTACTS_KEY, JSON.stringify(contactIds));
      console.log(`[CONTACTS-CACHE] Persisted ${contactIds.length} deleted contact IDs to storage`);
    } catch (error) {
      console.error('[CONTACTS-CACHE] Error persisting deleted contacts to storage:', error);
    }
  }
}

// Create a singleton instance
const deletedContactsCache = new DeletedContactsCache();

// Export the singleton
export default deletedContactsCache; 