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
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useContacts } from '../../contexts/ContactsContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AddContactScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { createContact, findContactByPhoneNumber, isLoading } = useContacts();
  const { userId } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [userAvatar, setUserAvatar] = useState(null);
  const [validNumber, setValidNumber] = useState(false);
  const [fetchedUser, setFetchedUser] = useState(null);
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  
  // Phone number validation and user info fetching
  useEffect(() => {
    // Reset states when phone number changes
    setUserNotFound(false);
    
    // Validate phone number format: 0 followed by 9 digits
    const phoneRegex = /^0\d{9}$/;
    const isValid = phoneRegex.test(phoneNumber);
    setValidNumber(isValid);
    
    // Reset user info when phone number changes
    if (!isValid) {
      setUserAvatar(null);
      setFetchedUser(null);
      return;
    }
    
    // Don't try to fetch if this is the user's own number
    const fetchUserInfo = async () => {
      try {
        setIsFetchingUser(true);
        // Use the authenticated endpoint since we're logged in
        const userInfo = await authAPI.findUserByPhoneNumber(phoneNumber);
        
        // Don't allow adding yourself as a contact
        if (userInfo && userInfo.id === userId) {
          setFetchedUser(null);
          setUserAvatar(null);
          return;
        }
        
        if (userInfo) {
          setFetchedUser(userInfo);
          setUserNotFound(false);
          // If user has a username/nickname, pre-fill it
          if (userInfo.username) {
            setNickname(userInfo.username);
          }
          
          // Try to get user avatar
          if (userInfo.id) {
            const avatarBase64 = await authAPI.getUserAvatar(userInfo.id);
            if (avatarBase64) {
              setUserAvatar(avatarBase64);
            }
          }
        } else {
          setFetchedUser(null);
          setUserAvatar(null);
          setUserNotFound(true);
        }
      } catch (error) {
        // Handle errors gracefully - don't show exception
        console.error('Failed to fetch user info:', error);
        setFetchedUser(null);
        setUserAvatar(null);
        setUserNotFound(true);
      } finally {
        setIsFetchingUser(false);
      }
    };
    
    // Only fetch if the number is valid and not the user's own number
    if (isValid) {
      fetchUserInfo();
    }
  }, [phoneNumber, userId]);
  
  // Handle phone number input with formatting
  const handlePhoneNumberChange = (text) => {
    // Only allow digits and limit to 10 characters (0 + 9 digits)
    const formattedNumber = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneNumber(formattedNumber);
  };
  
  // Save new contact
  const handleSaveContact = async () => {
    // Validate inputs
    if (!phoneNumber.trim()) {
      Alert.alert(t('common.error'), t('contacts.phoneNumber') + ' ' + t('auth.phoneRequired'));
      return;
    }
    
    if (!validNumber) {
      Alert.alert(t('common.error'), t('auth.phoneFormat'));
      return;
    }
    
    // Check if contact already exists
    const existingContact = findContactByPhoneNumber(phoneNumber);
    if (existingContact) {
      Alert.alert(t('common.error'), t('contacts.phoneExists'));
      return;
    }
    
    try {
      const contactData = {
        phone_number: phoneNumber,
        nickname: nickname.trim() || null,
        // If we found a user, include their user ID for linking
        contact_user_id: fetchedUser ? fetchedUser.id : null
      };
      
      const newContact = await createContact(contactData);
      
      // Navigate to chat with new contact
      navigation.replace('Chat', {
        contactId: newContact.id,
        contactName: newContact.nickname || newContact.phone_number
      });
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>{t('contacts.newContact')}</Text>
          
          {/* Avatar placeholder */}
          <View style={styles.avatarContainer}>
            <Avatar
              userAvatar={userAvatar}
              name={nickname || phoneNumber || '?'}
              size={100}
            />
            {isFetchingUser && (
              <ActivityIndicator 
                style={styles.avatarLoader} 
                size="small" 
                color={headerColor} 
              />
            )}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('contacts.phoneNumber')} *</Text>
            <TextInput
              style={[
                styles.input, 
                !phoneNumber || validNumber ? {} : styles.inputError
              ]}
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              placeholder="0XXXXXXXXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              maxLength={10}
            />
            {phoneNumber && !validNumber && (
              <Text style={styles.errorText}>
                {t('auth.phoneFormat')}
              </Text>
            )}
            {phoneNumber && validNumber && userNotFound && !isFetchingUser && (
              <Text style={styles.userNotFoundText}>
                {t('contacts.noRegisteredUser', 'No user found with this number')}
              </Text>
            )}
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
          
          <TouchableOpacity
            style={[
              styles.saveButton, 
              { backgroundColor: headerColor },
              (!validNumber || isLoading) ? styles.disabledButton : {}
            ]}
            onPress={handleSaveContact}
            disabled={!validNumber || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>{t('contacts.save')}</Text>
            )}
          </TouchableOpacity>
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
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoader: {
    position: 'absolute',
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    width: '100%',
  },
  inputError: {
    borderWidth: 1,
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginTop: 5,
    fontSize: 12,
  },
  userNotFoundText: {
    color: '#FF8C00',
    marginTop: 5,
    fontSize: 12,
  },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddContactScreen; 