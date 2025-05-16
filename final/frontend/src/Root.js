import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import store from './redux/store';

// Import i18n (language setup)
import '../i18n/i18n';

// Import context providers
import { ThemeProvider } from './contexts/ThemeContext';
import { ContactsProvider } from './contexts/ContactsContext';
import { MessagesProvider } from './contexts/MessagesContext';
import { AppLifecycleProvider } from './contexts/AppLifecycleContext';
import { OrientationProvider } from './contexts/OrientationContext';

// Import Redux-backed auth provider (replaces AuthProvider)
import AuthReduxProvider from './providers/AuthReduxProvider';

// Import app navigation
import AppNavigator from './navigation/AppNavigator';

export default function Root() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Provider store={store}>
          <OrientationProvider>
            <AuthReduxProvider>
              <ThemeProvider>
                <AppLifecycleProvider>
                  <ContactsProvider>
                    <MessagesProvider>
                      <AppNavigator />
                      <StatusBar style="light" />
                    </MessagesProvider>
                  </ContactsProvider>
                </AppLifecycleProvider>
              </ThemeProvider>
            </AuthReduxProvider>
          </OrientationProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 