import React, { useEffect } from 'react';
import { StatusBar, SafeAreaView, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppLifecycleProvider, useAppLifecycle } from './contexts/AppLifecycleContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ContactsProvider } from './contexts/ContactsContext';
import { MessagesProvider } from './contexts/MessagesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { OrientationProvider } from './contexts/OrientationContext';
import { initSocket, getSocket } from './services/api';
import { useTranslation } from 'react-i18next';
import deletedContactsCache from './services/DeletedContactsCache';
import './i18n';

import AppNavigator from './navigation/AppNavigator';

// Socket initialization and event listeners
const SocketListener = () => {
  const { userId } = useAuth();
  const { showBackgroundAlert, hideBackgroundAlert, formatBackgroundTime } = useAppLifecycle();
  const { t } = useTranslation();
  
  // Initialize socket connection and handle events
  useEffect(() => {
    if (!userId) return;
    
    const setupSocket = async () => {
      try {
        // Initialize socket
        await initSocket(userId);
        const socket = getSocket();
        
        if (!socket) {
          console.log('[APP] Socket connection not available');
          return;
        }
        
        // Listen for contact deletion events from server
        socket.on('contact_deleted', async (data) => {
          if (data && data.contactId) {
            console.log(`[APP] Received contact_deleted event for ID ${data.contactId}`);
            await deletedContactsCache.markAsDeleted(data.contactId);
          }
        });
        
        // Listen for batch contact deletion events
        socket.on('contacts_deleted', async (data) => {
          if (data && data.contactIds && Array.isArray(data.contactIds)) {
            console.log(`[APP] Received contacts_deleted event for ${data.contactIds.length} contacts`);
            await deletedContactsCache.markMultipleAsDeleted(data.contactIds);
          }
        });
        
        // Clean up listeners when component unmounts
        return () => {
          if (socket) {
            socket.off('contact_deleted');
            socket.off('contacts_deleted');
          }
        };
      } catch (error) {
        console.error('[APP] Error setting up socket listeners:', error);
      }
    };
    
    setupSocket();
  }, [userId]);
  
  // Show background time alert
  useEffect(() => {
    if (showBackgroundAlert) {
      Alert.alert(
        t('common.notice'),
        `${t('app.backgroundTime')}: ${formatBackgroundTime()}`,
        [{ text: 'OK', onPress: hideBackgroundAlert }]
      );
    }
  }, [showBackgroundAlert, formatBackgroundTime, hideBackgroundAlert, t]);
  
  return null;
};

// Main app component
const AppContent = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SocketListener />
      <AppNavigator />
    </SafeAreaView>
  );
};

// Root component with all providers
const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppLifecycleProvider>
          <ContactsProvider>
            <MessagesProvider>
              <OrientationProvider>
                <NavigationContainer>
                  <AppContent />
                </NavigationContainer>
              </OrientationProvider>
            </MessagesProvider>
          </ContactsProvider>
        </AppLifecycleProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App; 