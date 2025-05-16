import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, SafeAreaView, StyleSheet, View, Text, Platform, TouchableOpacity, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppLifecycleProvider, useAppLifecycle } from './contexts/AppLifecycleContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ContactsProvider } from './contexts/ContactsContext';
import { MessagesProvider } from './contexts/MessagesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { OrientationProvider } from './contexts/OrientationContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { initSocket, getSocket } from './services/api';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { deleteContact } from './redux/slices/contactsSlice';
import BackgroundTimeNotice from './components/BackgroundTimeNotice';
import './i18n';

import AppNavigator from './navigation/AppNavigator';

// Simple error boundary as a function component
const SafeAppWrapper = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Similar to componentDidCatch
  useEffect(() => {
    const handleError = (error, stackTrace) => {
      console.error('App Error:', error, stackTrace);
      setErrorMessage(error.toString());
      setHasError(true);
    };

    // Set up error handler
    const errorSubscription = ErrorUtils.setGlobalHandler(handleError);

    return () => {
      // Reset to default handler on cleanup
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error(error, isFatal);
      });
    };
  }, []);

  if (hasError) {
    return (
      <View style={errorStyles.container}>
        <Text style={errorStyles.title}>Something went wrong</Text>
        <Text style={errorStyles.message}>{errorMessage}</Text>
        <TouchableOpacity 
          style={errorStyles.button}
          onPress={() => setHasError(false)}
        >
          <Text style={errorStyles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
};

// Socket initialization and event listeners
const SocketListener = () => {
  try {
    const { userId } = useAuth();
    const { showBackgroundAlert, hideBackgroundAlert, formatBackgroundTime } = useAppLifecycle();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const prevAlertState = useRef(false);
    
    // Track alert state changes
    useEffect(() => {
      if (prevAlertState.current !== showBackgroundAlert) {
        console.log('[APP] Alert state changed from', prevAlertState.current, 'to', showBackgroundAlert);
        prevAlertState.current = showBackgroundAlert;
      }
    }, [showBackgroundAlert]);
    
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
              
              // Dispatch Redux action to delete contact
              try {
                await dispatch(deleteContact(data.contactId)).unwrap();
              } catch (error) {
                console.error('[APP] Error processing contact_deleted event:', error);
              }
            }
          });
          
          // Listen for batch contact deletion events
          socket.on('contacts_deleted', async (data) => {
            if (data && data.contactIds && Array.isArray(data.contactIds)) {
              console.log(`[APP] Received contacts_deleted event for ${data.contactIds.length} contacts`);
              
              // Process each contact ID with Redux
              for (const contactId of data.contactIds) {
                try {
                  await dispatch(deleteContact(contactId)).unwrap();
                } catch (error) {
                  console.error(`[APP] Error processing deletion for contact ID ${contactId}:`, error);
                }
              }
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
    }, [userId, dispatch]);
    
    return null;
  } catch (error) {
    console.error('[APP] Error in SocketListener:', error);
    return null;
  }
};

// Main app component
const AppContent = () => {
  const { showBackgroundAlert } = useAppLifecycle();
  
  useEffect(() => {
    console.log('[APP] AppContent mounted');
    return () => console.log('[APP] AppContent unmounted');
  }, []);
  
  useEffect(() => {
    console.log('[APP] AppContent - showBackgroundAlert changed to:', showBackgroundAlert);
  }, [showBackgroundAlert]);
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SocketListener />
      <AppNavigator />
    </View>
  );
};

// The BackgroundNoticeWrapper component isolates the BackgroundTimeNotice to ensure it gets context updates
const BackgroundNoticeWrapper = () => {
  console.log('[APP] BackgroundNoticeWrapper rendering');
  const { 
    showBackgroundAlert, 
    refreshCounter,
    forceShowAlert,
    appState 
  } = useAppLifecycle();
  
  // Track initial mount
  const componentMounted = useRef(false);
  
  // Log important events
  useEffect(() => {
    console.log('[APP] BackgroundNoticeWrapper mounted');
    componentMounted.current = true;
    
    // Add a direct AppState listener as a backup
    const handleAppStateChange = (nextAppState) => {
      console.log(`[APP-WRAPPER] Direct AppState change to: ${nextAppState}`);
      
      // When returning to foreground, we do an extra check to ensure the alert
      // is properly displayed if needed
      if (nextAppState === 'active' && componentMounted.current) {
        setTimeout(() => {
          console.log('[APP-WRAPPER] Checking for needed background alert');
          if (showBackgroundAlert) {
            console.log('[APP-WRAPPER] Background alert should be showing');
          }
        }, 300);
      }
    };
    
    // Set up listener
    let subscription;
    try {
      subscription = AppState.addEventListener('change', handleAppStateChange);
    } catch (error) {
      AppState.addEventListener('change', handleAppStateChange);
      subscription = {
        remove: () => AppState.removeEventListener('change', handleAppStateChange)
      };
    }
    
    return () => {
      console.log('[APP] BackgroundNoticeWrapper unmounted');
      componentMounted.current = false;
      
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, [showBackgroundAlert]);
  
  useEffect(() => {
    console.log('[APP] BackgroundNoticeWrapper - showBackgroundAlert changed to:', showBackgroundAlert);
  }, [showBackgroundAlert]);
  
  useEffect(() => {
    console.log('[APP] BackgroundNoticeWrapper - refreshCounter:', refreshCounter);
  }, [refreshCounter]);
  
  useEffect(() => {
    console.log('[APP] BackgroundNoticeWrapper - appState:', appState);
  }, [appState]);
  
  return (
    <>
      <BackgroundTimeNotice />
      
      {/* Testing button only shown in development */}
      {__DEV__ && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 40,
            right: 20,
            backgroundColor: '#FF3B30',
            padding: 8,
            borderRadius: 5,
            zIndex: 9999,
          }}
          onPress={() => {
            console.log('[APP] Test button pressed, forcing background alert');
            forceShowAlert(10000); // 10 seconds
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Test Alert</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

// Root component with all providers
const App = () => {
  return (
    <SafeAppWrapper>
      <AuthProvider>
        <ThemeProvider>
          <AppLifecycleProvider>
            {/* Render BackgroundTimeNotice directly within the AppLifecycleProvider */}
            <BackgroundNoticeWrapper />
            <ContactsProvider>
              <MessagesProvider>
                <OrientationProvider>
                    <NavigationContainer>
                      <SafeAreaView style={styles.safeArea}>
                        <AppContent />
                      </SafeAreaView>
                    </NavigationContainer>
                </OrientationProvider>
              </MessagesProvider>
            </ContactsProvider>
          </AppLifecycleProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAppWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative', // Ensure proper stacking context
    backgroundColor: '#fff', // Set a background color
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#dc3545',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#343a40',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default App; 