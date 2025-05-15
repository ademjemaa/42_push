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
  Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrientation } from '../../hooks/useOrientation';
import * as ImagePicker from 'expo-image-picker';
import Avatar from '../../components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';

const RegisterScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { register, isLoading } = useAuth();
  const { isPortrait } = useOrientation();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [validNumber, setValidNumber] = useState(false);
  const [isCheckingNumber, setIsCheckingNumber] = useState(false);
  const [numberExists, setNumberExists] = useState(false);
  
  // Validate phone number format as user types
  useEffect(() => {
    // Validate phone number format: 0 followed by 9 digits
    const phoneRegex = /^0\d{9}$/;
    const isValid = phoneRegex.test(phoneNumber);
    setValidNumber(isValid);
    
    // Reset number exists check when user changes the number
    if (numberExists) {
      setNumberExists(false);
    }
    
    // Check if phone number exists when format is valid
    if (isValid) {
      checkPhoneNumberExists(phoneNumber);
    }
  }, [phoneNumber]);
  
  // Check if phone number already exists in the system
  const checkPhoneNumberExists = async (number) => {
    setIsCheckingNumber(true);
    try {
      const user = await authAPI.findUserByPhoneNumber(number);
      if (user) {
        // Phone number is already registered
        setNumberExists(true);
      } else {
        setNumberExists(false);
      }
    } catch (error) {
      console.error('Error checking phone number:', error);
    } finally {
      setIsCheckingNumber(false);
    }
  };
  
  // Handle phone number input with proper formatting
  const handlePhoneNumberChange = (text) => {
    // Only allow digits and limit to 10 characters (0 + 9 digits)
    const formattedNumber = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneNumber(formattedNumber);
  };
  
  // Request permission to access the photo library
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permissionDenied'), t('auth.avatarPermission'));
      return false;
    }
    return true;
  };
  
  // Pick avatar image from photo library
  const pickAvatar = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('auth.imageFailed'));
    }
  };
  
  const handleRegister = async () => {
    // Validate inputs
    if (!phoneNumber.trim()) {
      Alert.alert(t('common.error'), t('auth.phoneRequired'));
      return;
    }
    
    if (!validNumber) {
      Alert.alert(t('common.error'), t('auth.phoneFormat'));
      return;
    }
    
    if (numberExists) {
      Alert.alert(t('common.error'), t('auth.phoneExists'));
      return;
    }
    
    if (!username.trim()) {
      Alert.alert(t('common.error'), t('auth.usernameRequired'));
      return;
    }
    
    if (!password.trim()) {
      Alert.alert(t('common.error'), t('auth.passwordRequired'));
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMatch'));
      return;
    }
    
    try {
      // Add avatar to registration data if available
      const userData = { 
        phone_number: phoneNumber, 
        username, 
        password,
        avatar_uri: avatar || null
      };
      
      await register(userData);
      Alert.alert(
        t('common.success'), 
        t('auth.registerSuccess'), 
        [{ text: t('auth.ok'), onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };
  
  // Layout changes based on orientation
  const containerStyle = isPortrait 
    ? styles.portraitContainer 
    : styles.landscapeContainer;
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={containerStyle}>
          <View style={styles.formContainer}>
            <Text style={[styles.title, { color: headerColor }]}>
              {t('auth.register')}
            </Text>
            
            {/* Avatar upload section */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity style={styles.avatarButton} onPress={pickAvatar}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <Avatar name={username || '?'} size={100} />
                )}
                <View style={[styles.avatarIconContainer, { backgroundColor: headerColor }]}>
                  <Ionicons name="camera-outline" size={20} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarText}>
                {avatar ? t('auth.changeAvatar') : t('auth.addAvatar')}
              </Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.phoneNumber')}</Text>
              <TextInput
                style={[
                  styles.input,
                  (!phoneNumber || validNumber) && !numberExists ? {} : styles.inputError
                ]}
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                placeholder="0XXXXXXXXX"
                keyboardType="phone-pad"
                autoCapitalize="none"
                maxLength={10}
              />
              {isCheckingNumber && validNumber && (
                <View style={styles.checkingContainer}>
                  <ActivityIndicator size="small" color={headerColor} />
                  <Text style={styles.checkingText}>{t('auth.checkingNumber')}</Text>
                </View>
              )}
              {phoneNumber && !validNumber && (
                <Text style={styles.errorText}>
                  {t('auth.phoneFormat', 'Phone number must be 0 followed by 9 digits')}
                </Text>
              )}
              {validNumber && numberExists && (
                <Text style={styles.errorText}>
                  {t('auth.phoneExists')}
                </Text>
              )}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.username')}</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder={t('auth.username')}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.password')}
                secureTextEntry
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('auth.confirmPassword')}
                secureTextEntry
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.button, 
                { backgroundColor: headerColor },
                ((!validNumber && phoneNumber.length > 0) || numberExists || isCheckingNumber) ? styles.buttonDisabled : {}
              ]}
              onPress={handleRegister}
              disabled={isLoading || (!validNumber && phoneNumber.length > 0) || numberExists || isCheckingNumber}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.registerButton')}</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.hasAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLink, { color: headerColor }]}>
                  {t('auth.login')}
                </Text>
              </TouchableOpacity>
            </View>
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
  keyboardAvoid: {
    flex: 1,
  },
  portraitContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  landscapeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarButton: {
    position: 'relative', 
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
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
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  checkingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 12,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: 'gray',
    marginRight: 5,
  },
  loginLink: {
    fontWeight: 'bold',
  },
});

export default RegisterScreen; 