import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useGlobalOrientation } from '../../contexts/OrientationContext';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = () => {
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { userProfile, uploadAvatar } = useAuth();
  const { isPortrait, width, height } = useGlobalOrientation();
  
  // Get user avatar
  const userAvatar = userProfile?.avatar 
    ? `data:image/jpeg;base64,${userProfile.avatar}` 
    : null;
  
  // Handle avatar upload
  const handleAvatarPress = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(t('common.error'), 'Permission to access photos is required');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Lower quality to reduce file size
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        try {
          // Use the image URI directly
          await uploadAvatar(result.assets[0].uri);
        } catch (error) {
          console.error('Error uploading avatar:', error);
          Alert.alert(t('common.error'), error.message);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), error.message);
    }
  };
  
  // Calculate avatar size based on screen dimensions
  const avatarSize = isPortrait ? Math.min(width * 0.4, 120) : Math.min(height * 0.4, 120);
  
  return (
    <ResponsiveLayout>
      <View style={[
        styles.container,
        isPortrait ? styles.portraitContainer : styles.landscapeContainer
      ]}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t('home.profile')}</Text>
          <Text style={styles.headerSubtitle}>{t('home.manageProfile')}</Text>
        </View>
        
        {/* User profile card */}
        <View style={styles.profileCard}>
          {/* Avatar section */}
          <View style={[
            styles.profileContainer,
            isPortrait ? styles.portraitProfileContainer : styles.landscapeProfileContainer
          ]}>
            <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarContainer}>
              <Avatar 
                imageUri={userAvatar}
                name={userProfile?.username || ''}
                size={avatarSize}
              />
              <View style={[styles.uploadBadge, { backgroundColor: headerColor }]}>
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>
            
            <View style={isPortrait ? styles.portraitUserInfo : styles.landscapeUserInfo}>
              {/* Username section */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>{t('auth.username')}</Text>
                <Text style={[
                  styles.infoValue,
                  isPortrait ? styles.portraitInfoValue : styles.landscapeInfoValue
                ]}>
                  {userProfile?.username || 'User'}
                </Text>
              </View>
              
              {/* Phone number section */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>{t('auth.phoneNumber')}</Text>
                <Text style={[
                  styles.infoValue,
                  isPortrait ? styles.portraitInfoValue : styles.landscapeInfoValue
                ]}>
                  {userProfile?.phone_number || ''}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Account info card */}
        <View style={styles.accountCard}>
          <Text style={styles.cardTitle}>{t('home.accountInfo')}</Text>
          <View style={styles.accountInfoRow}>
            <Ionicons name="calendar-outline" size={20} color="#555" />
            <View style={styles.accountInfoContent}>
              <Text style={styles.accountInfoLabel}>{t('home.memberSince')}</Text>
              <Text style={styles.accountInfoValue}>
                {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : '-'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ResponsiveLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  profileContainer: {
    width: '100%',
  },
  portraitProfileContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  landscapeProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: isPortrait => isPortrait ? 20 : 0,
    alignItems: 'center',
  },
  portraitUserInfo: {
    width: '100%',
    alignItems: 'center',
  },
  landscapeUserInfo: {
    flex: 1,
    marginLeft: 30,
  },
  infoSection: {
    marginTop: 16,
    width: '100%',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontWeight: '600',
    color: '#333',
  },
  portraitInfoValue: {
    fontSize: 22,
    textAlign: 'center',
  },
  landscapeInfoValue: {
    fontSize: 20,
    textAlign: 'left',
  },
  uploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountInfoContent: {
    marginLeft: 12,
    flex: 1,
  },
  accountInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  accountInfoValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  portraitContainer: {
    // Add portrait-specific styles here
  },
  landscapeContainer: {
    // Add landscape-specific styles here
  }
});

export default HomeScreen; 