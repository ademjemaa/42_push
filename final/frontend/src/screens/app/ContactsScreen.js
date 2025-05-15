import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  AppState
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useContacts } from '../../contexts/ContactsContext';
import { useMessages } from '../../contexts/MessagesContext';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import ContactListItem from '../../components/ContactListItem';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalOrientation } from '../../contexts/OrientationContext';

const ContactsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { contacts, fetchContacts, isLoading } = useContacts();
  const { conversations } = useMessages();
  const { isPortrait } = useGlobalOrientation();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const conversationsRef = useRef(conversations);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  
  // Safe fetchContacts with debouncing to prevent rapid re-fetches
  const safeFetchContacts = useCallback(async (force = false) => {
    if (!isMountedRef.current || (refreshing && !force)) return;
    
    // Add debouncing - only fetch if it's been at least 2 seconds since last fetch
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 2000) {
      console.log('[CONTACTS] Skipping fetch - debounced');
      return;
    }
    
    try {
      lastFetchTimeRef.current = now;
      await fetchContacts();
    } catch (error) {
      console.error('[CONTACTS] Error fetching contacts:', error);
    }
  }, [fetchContacts, refreshing]);
  
  // Fetch contacts on component mount - only run once
  useEffect(() => {
    isMountedRef.current = true;
    safeFetchContacts();
    
    // Clean up
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array ensures this only runs once
  
  // Set up refresh interval and app state listener in a separate effect
  useEffect(() => {
    // Set up refresh interval for real-time updates
    const refreshIntervalId = setInterval(() => {
      if (isMountedRef.current && !refreshing) {
        safeFetchContacts();
      }
    }, 15000); // Refresh every 15 seconds
    
    // Set up app state listener to refresh when app comes back to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active' && 
        isMountedRef.current
      ) {
        console.log('[CONTACTS] App has come to the foreground, refreshing contacts');
        safeFetchContacts(true); // Force refresh when returning to foreground
      }
      appStateRef.current = nextAppState;
    });
    
    // Clean up
    return () => {
      clearInterval(refreshIntervalId);
      subscription.remove();
    };
  }, [safeFetchContacts]); // This effect depends only on safeFetchContacts
  
  // Monitor conversations changes in a separate effect with proper comparison
  useEffect(() => {
    // Deep comparison helper for conversations
    const haveConversationsChanged = () => {
      const oldKeys = Object.keys(conversationsRef.current);
      const newKeys = Object.keys(conversations);
      
      // Quick check for different conversation IDs
      if (oldKeys.length !== newKeys.length) {
        return true;
      }
      
      // Check if there are any new messages in existing conversations
      for (const key of newKeys) {
        const oldConvo = conversationsRef.current[key] || [];
        const newConvo = conversations[key] || [];
        
        if (oldConvo.length !== newConvo.length) {
          return true;
        }
        
        // Check if the last message ID is different (quick comparison)
        if (
          oldConvo.length > 0 && 
          newConvo.length > 0 && 
          oldConvo[oldConvo.length - 1]?.id !== newConvo[newConvo.length - 1]?.id
        ) {
          return true;
        }
      }
      
      return false;
    };
    
    // Only fetch if conversations actually changed
    if (haveConversationsChanged() && isMountedRef.current) {
      console.log('[CONTACTS] Detected new messages, refreshing contacts');
      safeFetchContacts();
    }
    
    // Update reference for next comparison
    conversationsRef.current = conversations;
  }, [conversations, safeFetchContacts]);
  
  // Screen focus effect
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isMountedRef.current) {
        console.log('[CONTACTS] Screen focused, refreshing contacts');
        safeFetchContacts(true); // Force refresh on screen focus
      }
    });
    
    return unsubscribe;
  }, [navigation, safeFetchContacts]);
  
  // Refresh contacts - user-initiated refresh
  const handleRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setRefreshing(true);
    try {
      await fetchContacts();
    } catch (error) {
      console.error('[CONTACTS] Error refreshing contacts:', error);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [fetchContacts]);
  
  // Navigate to chat screen for a contact
  const handleContactPress = useCallback((contact) => {
    navigation.navigate('Chat', { 
      contactId: contact.id,
      contactName: contact.nickname || contact.phone_number
    });
  }, [navigation]);
  
  // Handle add contact button press
  const handleAddContact = useCallback(() => {
    navigation.navigate('AddContact');
  }, [navigation]);
  
  // Filter contacts based on search query - memoized
  const filteredContacts = React.useMemo(() => {
    return contacts.filter(contact => {
      const searchLower = searchQuery.toLowerCase();
      const nickname = (contact.nickname || '').toLowerCase();
      const phoneNumber = (contact.phone_number || '').toLowerCase();
      
      return nickname.includes(searchLower) || phoneNumber.includes(searchLower);
    });
  }, [contacts, searchQuery]);
  
  // Sort contacts: those with messages first, then alphabetically - memoized
  const sortedContacts = React.useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      // If both have last messages, sort by timestamp
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
      }
      // If only one has a last message, prioritize that one
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      
      // For newly created contacts without messages, prioritize most recent ones
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      
      // Otherwise sort alphabetically by nickname or phone
      const nameA = (a.nickname || a.phone_number || '').toLowerCase();
      const nameB = (b.nickname || b.phone_number || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [filteredContacts]);
  
  // Render item optimization with memo
  const renderContactItem = useCallback(({ item }) => (
    <ContactListItem 
      contact={item} 
      onPress={handleContactPress}
    />
  ), [handleContactPress]);
  
  // Header component
  const Header = (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('common.search')}
          clearButtonMode="while-editing"
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );
  
  // Content to render
  const renderContent = () => {
    if (isLoading && !refreshing && contacts.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={headerColor} />
        </View>
      );
    }
    
    if (sortedContacts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? t('contacts.noResults') : t('contacts.noContacts')}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: headerColor }]}
            onPress={handleAddContact}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>{t('contacts.addContact')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <FlatList
        data={sortedContacts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderContactItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    );
  };
  
  // Floating action button
  const FloatingButton = (
    <TouchableOpacity
      style={[styles.floatingButton, { backgroundColor: headerColor }]}
      onPress={handleAddContact}
    >
      <Ionicons name="add" size={24} color="white" />
    </TouchableOpacity>
  );
  
  return (
    <ResponsiveLayout
      contentContainerStyle={styles.contentContainer}
      scrollable={false}
      header={Header}
      footer={FloatingButton}
    >
      {renderContent()}
    </ResponsiveLayout>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  listContainer: {
    paddingTop: 0,
    paddingBottom: 16,
  },
});

export default ContactsScreen;