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
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalOrientation } from '../../contexts/OrientationContext';
import { showErrorToast, showSuccessToast } from '../../components/Toast';

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  const { login, isLoading } = useAuth();
  const { isPortrait } = useGlobalOrientation();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [validNumber, setValidNumber] = useState(false);
  
  useEffect(() => {
    const phoneRegex = /^0\d{9}$/;
    setValidNumber(phoneRegex.test(phoneNumber));
  }, [phoneNumber]);
  
  const handlePhoneNumberChange = (text) => {
    const formattedNumber = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneNumber(formattedNumber);
  };
  
  const handleLogin = async () => {
    if (!phoneNumber.trim()) {
      showErrorToast('auth.phoneRequired');
      return;
    }
    
    if (!validNumber) {
      showErrorToast('auth.phoneFormat');
      return;
    }
    
    if (!password.trim()) {
      showErrorToast('auth.passwordRequired');
      return;
    }
    
    try {
      await login({ phone_number: phoneNumber, password });
      showSuccessToast('auth.loginSuccess'); 
    } catch (error) {
      showErrorToast('common.error', { message: error.message });
    }
  };
  
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
              {t('auth.login')}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.phoneNumber')}</Text>
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
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: headerColor }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.loginButton')}</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>{t('auth.noAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.registerLink, { color: headerColor }]}>
                  {t('auth.register')}
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
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
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
    borderWidth:.5,
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: 'gray',
    marginRight: 5,
  },
  registerLink: {
    fontWeight: 'bold',
  },
});

export default LoginScreen; 