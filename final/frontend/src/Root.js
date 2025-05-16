import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message'; // Import with custom components
import store from './redux/store';

// Import i18n (language setup)
import '../i18n/i18n';

// Import context providers
import { ThemeProvider } from './contexts/ThemeContext';
import { ContactsProvider } from './contexts/ContactsContext';
import { MessagesProvider } from './contexts/MessagesContext';
import { OrientationProvider } from './contexts/OrientationContext';
import AppStateToastListener from './components/Toast'; 


import AuthReduxProvider from './providers/AuthReduxProvider';

import AppNavigator from './navigation/AppNavigator';

const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#22c55e' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#ef4444' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#3b82f6' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
};

export default function Root() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Provider store={store}>
          <OrientationProvider>
            <AuthReduxProvider>
              <ThemeProvider>
                <ContactsProvider>
                  <MessagesProvider>
                    <AppNavigator />
                    <StatusBar style="light" />
                  </MessagesProvider>
                </ContactsProvider>
              </ThemeProvider>
            </AuthReduxProvider>
          </OrientationProvider>
        </Provider>
      </SafeAreaProvider>

      <Toast config={toastConfig} />

      <AppStateToastListener />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
