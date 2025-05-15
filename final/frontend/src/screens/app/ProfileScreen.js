import React, { useState } from 'react';
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
  Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Avatar from '../../components/Avatar';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { userProfile, updateProfile, uploadAvatar, isLoading, logout } = useAuth();
  
  const [username, setUsername] = useState(userProfile?.username || '');
  const [isEditing, setIsEditing] = useState(false);
  
  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!username.trim()) {
      Alert.alert('Error', t('auth.usernameRequired'));
      return;
    }
    
    try {
      await updateProfile({ username });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  // Handle avatar selection and upload
  const handleChooseAvatar = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission required', 'You need to allow access to your photos to change your avatar');
        return;
      }
      
      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Upload image
        await uploadAvatar(result.assets[0].uri);
        Alert.alert('Success', 'Avatar updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      t('common.logout'),
      'Are you sure you want to logout?',
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.logout'),
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };
  
  // Get user avatar
  const userAvatar = userProfile?.avatar 
    ? `data:image/jpeg;base64,${userProfile.avatar}` 
    : null;
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Avatar section */}
          <View style={styles.avatarContainer}>
            <Avatar 
              imageUri={userAvatar}
              name={userProfile?.username || ''}
              size={100}
            />
            
            <TouchableOpacity
              style={[styles.changeAvatarButton, { backgroundColor: headerColor }]}
              onPress={handleChooseAvatar}
            >
              <Ionicons name="camera" size={16} color="white" />
              <Text style={styles.changeAvatarText}>{t('settings.changeAvatar')}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Profile info section */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('auth.phoneNumber')}</Text>
              <Text style={styles.infoValue}>{userProfile?.phone_number || ''}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('auth.username')}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{userProfile?.username || ''}</Text>
              )}
            </View>
            
            {/* Actions */}
            <View style={styles.actionsContainer}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setUsername(userProfile?.username || '');
                      setIsEditing(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: headerColor }]}
                    onPress={handleUpdateProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.buttonText}>{t('common.save')}</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: headerColor }]}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.buttonText}>{t('common.edit')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Logout button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>{t('common.logout')}</Text>
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
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 12,
  },
  changeAvatarText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
  },
  infoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
  },
  usernameInput: {
    fontSize: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'gray',
    paddingVertical: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 10,
    backgroundColor: '#EEEEEE',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  cancelButtonText: {
    color: 'black',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
  },
  logoutText: {
    color: '#FF3B30',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProfileScreen; 