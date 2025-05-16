import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  BackHandler
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useContacts } from '../../contexts/ContactsContext';
import { useMessages } from '../../contexts/MessagesContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalOrientation } from '../../contexts/OrientationContext';

const EditContactScreen = ({ route, navigation }) => {
  const { contactId } = route.params;
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { getContactById, updateContact, deleteContact, blockContact, unblockContact, isLoading } = useContacts();
  const { deleteConversation } = useMessages();
  
  const [contact, setContact] = useState(null);
  const [nickname, setNickname] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  
  // Load contact details
  useEffect(() => {
    const loadContact = async () => {
      try {
        const contactData = await getContactById(contactId);
        setContact(contactData);
        setNickname(contactData.nickname || '');
        if (contactData.avatar) {
          setAvatarUri(`data:image/jpeg;base64,${contactData.avatar}`);
        }
      } catch (error) {
        Alert.alert('Error', error.message);
        navigation.goBack();
      }
    };
    
    loadContact();
  }, [contactId]);
  
  // Custom back button behavior when coming from Chat
  useEffect(() => {
    if (route.params?.returnToChat) {
      // Set a custom back button that replaces screens instead of stacking
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity 
            style={{ marginLeft: 10 }}
            onPress={() => {
              navigation.replace('Chat', {
                contactId,
                contactName: contact?.nickname || contact?.phone_number,
              });
            }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>
              {t('common.back')}
            </Text>
          </TouchableOpacity>
        ),
      });
      
      // Handle hardware back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.replace('Chat', {
          contactId,
          contactName: contact?.nickname || contact?.phone_number,
        });
        return true; // Prevent default back action
      });
      
      return () => backHandler.remove();
    }
  }, [navigation, route.params?.returnToChat, contactId, contact]);
  
  // Save contact changes
  const handleSaveContact = async () => {
    console.log('\n[SCREEN] ========= CONTACT SAVE STARTED =========');
    
    try {
      // Validate nickname - prevent empty values
      const trimmedNickname = nickname.trim();
      if (trimmedNickname === '') {
        Alert.alert(
          t('common.error'), 
          t('contacts.emptyNicknameError', 'Nickname cannot be empty')
        );
        return;
      }
      
      // 1. Track changes to know what was updated
      let updates = [];
      
      // 2. Update nickname if changed
      if (trimmedNickname !== contact.nickname) {
        console.log('[SCREEN] Nickname changed, updating...');
        updates.push('nickname');
        
        try {
          // Send the trimmed nickname, never null
          const result = await updateContact(contactId, { 
            nickname: trimmedNickname 
          });
          console.log('[SCREEN] Nickname updated successfully:', result.nickname);
        } catch (nicknameError) {
          console.error('[SCREEN] Nickname update failed:', nicknameError);
          throw new Error('Failed to update nickname: ' + nicknameError.message);
        }
      }
      
      // 3. Refresh contact details to get the updated nickname
      console.log('[SCREEN] Refreshing contact details');
      const updatedContact = await getContactById(contactId);
      console.log('[SCREEN] Contact refreshed:', updatedContact.nickname);
      
      // 4. Show success message if changes were made
      if (updates.length > 0) {
        const changedFields = updates.join(' and ');
        Alert.alert(t('common.success'), t('contacts.updateSuccess', {changedFields}));
      } else {
        console.log('[SCREEN] No changes made to save');
      }
      
      // 5. Check if we came from chat and should return there
      console.log('[SCREEN] Checking navigation return path');
      const returnToChat = route.params?.returnToChat;
      
      if (returnToChat) {
        // Use replace to avoid stacking screens
        console.log('[SCREEN] Replacing current screen with updated Chat');
        navigation.replace('Chat', {
          contactId,
          contactName: trimmedNickname || contact.phone_number,
          updateTimestamp: Date.now()
        });
      } else {
        // Normal navigation back
        console.log('[SCREEN] Navigating back');
        navigation.goBack();
      }
      
      console.log('[SCREEN] ========= CONTACT SAVE COMPLETED =========\n');
    } catch (error) {
      console.error('[SCREEN] Save contact error:', error);
      Alert.alert(t('common.error'), error.message);
    }
  };
  
  // Handle delete contact
  const handleDeleteContact = () => {
    Alert.alert(
      t('contacts.deleteContact'),
      t('contacts.deleteConfirmation'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.delete'),
          onPress: async () => {
            try {
              // Navigate immediately before deletion to prevent accessing deleted contact
              if (route.params?.returnToChat) {
                // If we came from chat, go back to Contacts tab instead of back to deleted chat
                navigation.navigate('Main', { screen: 'Contacts' });
              } else {
                navigation.goBack();
              }
              
              // Delete conversation messages first
              try {
                console.log(`[SCREEN] Deleting conversation for contact ID ${contactId}`);
                await deleteConversation(contactId);
              } catch (conversationError) {
                console.log(`[SCREEN] Error deleting conversation: ${conversationError.message}`);
                // Continue with contact deletion even if conversation deletion fails
              }
              
              // After navigation, delete the contact
              await deleteContact(contactId);
              
              // Show success message after navigation
              setTimeout(() => {
                Alert.alert('Success', t('contacts.contactDeleted'));
              }, 300);
              
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Handle block/unblock contact
  const handleBlockToggle = () => {
    if (contact?.is_blocked) {
      // Unblock
      Alert.alert(
        t('contacts.unblockContact'),
        t('contacts.unblockConfirmation'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel'
          },
          {
            text: t('contacts.unblock'),
            onPress: async () => {
              try {
                await unblockContact(contactId);
                setContact(prev => ({ ...prev, is_blocked: false }));
                Alert.alert('Success', t('contacts.contactUnblocked'));
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } else {
      // Block
      Alert.alert(
        t('contacts.blockContact'),
        t('contacts.blockConfirmation'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel'
          },
          {
            text: t('contacts.block'),
            onPress: async () => {
              try {
                await blockContact(contactId);
                setContact(prev => ({ ...prev, is_blocked: true }));
                Alert.alert('Success', t('contacts.contactBlocked'));
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            },
            style: 'destructive'
          }
        ]
      );
    }
  };
  
  if (!contact) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={headerColor} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Avatar section (display only) */}
          <View style={styles.avatarContainer}>
            <Avatar
              imageUri={avatarUri}
              userAvatar={contact.user_avatar}
              name={nickname || contact.phone_number}
              size={120}
            />
          </View>
          
          {/* Contact info */}
          <View style={styles.infoContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('contacts.phoneNumber')}</Text>
              <Text style={styles.phoneNumber}>{contact.phone_number}</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('contacts.nickname')}</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder={t('contacts.nickname')}
              />
            </View>
          </View>
          
          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: headerColor }]}
            onPress={handleSaveContact}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>{t('contacts.save')}</Text>
            )}
          </TouchableOpacity>
          
          {/* Action icons section */}
          <View style={styles.actionIconsContainer}>
            {/* Delete icon */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleDeleteContact}
            >
              <View style={[styles.iconCircle, styles.deleteIconCircle]}>
                <Ionicons name="trash-outline" size={30} color="white" />
              </View>
              <Text style={styles.iconText}>{t('common.delete')}</Text>
            </TouchableOpacity>
            
            {/* Block/Unblock icon */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleBlockToggle}
            >
              <View style={[
                styles.iconCircle, 
                contact?.is_blocked ? styles.unblockIconCircle : styles.blockIconCircle
              ]}>
                <Ionicons 
                  name={contact?.is_blocked ? "lock-open-outline" : "lock-closed-outline"} 
                  size={30} 
                  color="white" 
                />
              </View>
              <Text style={styles.iconText}>
                {contact?.is_blocked ? t('common.unblock') : t('common.block')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  infoContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  actionIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    width: '100%',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  deleteIconCircle: {
    backgroundColor: '#FF3B30',
  },
  blockIconCircle: {
    backgroundColor: '#FF9500',
  },
  unblockIconCircle: {
    backgroundColor: '#4CAF50',
  },
  iconText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
});

export default EditContactScreen; 