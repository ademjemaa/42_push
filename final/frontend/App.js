import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// Import i18n (language setup)
import './i18n/i18n';

// Import context providers
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ContactsProvider } from './src/contexts/ContactsContext';
import { MessagesProvider } from './src/contexts/MessagesContext';
import { AppLifecycleProvider } from './src/contexts/AppLifecycleContext';
import { OrientationProvider } from './src/contexts/OrientationContext';

// Import app navigation
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <OrientationProvider>
          <AuthProvider>
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
          </AuthProvider>
        </OrientationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
