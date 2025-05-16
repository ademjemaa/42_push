import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useMessages } from '../../contexts/MessagesContext';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import ContactListItem from '../../components/ContactListItem';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalOrientation } from '../../contexts/OrientationContext';
import { 
  fetchContacts as fetchContactsAction,
  selectAllContacts,
  selectContactsStatus
} from '../../redux/slices/contactsSlice';

const ContactsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { conversations } = useMessages();
  const { isPortrait } = useGlobalOrientation();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = React.useRef(true);
  
  const dispatch = useDispatch();
  const contacts = useSelector(selectAllContacts);
  const isLoading = useSelector(selectContactsStatus) === 'loading';
  
  // Fetch contacts on component mount
  useEffect(() => {
    isMountedRef.current = true;
    dispatch(fetchContactsAction());
    
    // Clean up
    return () => {
      isMountedRef.current = false;
    };
  }, [dispatch]); // Empty dependency array ensures this only runs once
  
  // Screen focus effect
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isMountedRef.current) {
        console.log('[CONTACTS] Screen focused, refreshing contacts');
        dispatch(fetchContactsAction());
      }
    });
    
    return unsubscribe;
  }, [navigation, dispatch]);
  
  // Handle explicit refresh parameter from navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      // Check if we have a refresh parameter from navigation
      const refreshParam = navigation.getState()?.routes?.find(
        (route) => route.name === 'Contacts'
      )?.params?.refresh;
      
      if (refreshParam && isMountedRef.current) {
        console.log('[CONTACTS] Received refresh parameter, refreshing contacts');
        dispatch(fetchContactsAction());
      }
    });
    
    return unsubscribe;
  }, [navigation, dispatch]);
  
  // Refresh contacts - user-initiated refresh
  const handleRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setRefreshing(true);
    try {
      await dispatch(fetchContactsAction()).unwrap();
    } catch (error) {
      console.error('[CONTACTS] Error refreshing contacts:', error);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [dispatch]);
  
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