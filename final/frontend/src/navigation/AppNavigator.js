import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

// Contexts
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// App Screens
import HomeScreen from '../screens/app/HomeScreen';
import ContactsScreen from '../screens/app/ContactsScreen';
import SettingsScreen from '../screens/app/SettingsScreen';
import ChatScreen from '../screens/app/ChatScreen';
import AddContactScreen from '../screens/app/AddContactScreen';
import EditContactScreen from '../screens/app/EditContactScreen';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Navigator (Login/Register)
const AuthNavigator = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('auth.login') }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t('auth.register') }} />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const TabNavigator = () => {
  const { t } = useTranslation();
  const { headerColor } = useTheme();
  
  return (
    <Tab.Navigator
      initialRouteName="Contacts"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: headerColor,
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: headerColor,
          shadowOffset: { height: 0, width: 0 },
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: t('home.title'),
          headerTitleAlign: 'center',
        }} 
      />
      <Tab.Screen 
        name="Contacts" 
        component={ContactsScreen} 
        options={{ 
          title: t('contacts.title'),
          headerTitleAlign: 'center',
        }} 
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          title: t('settings.title'),
          headerTitleAlign: 'center',
        }} 
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { userToken, isLoading } = useAuth();
  const { t } = useTranslation();
  const { headerColor } = useTheme();

  // Show loading screen if auth is loading
  if (isLoading) {
    return null; // Or a loading component
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: headerColor,
            shadowOffset: { height: 0, width: 0 },
            shadowOpacity: 0,
            elevation: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      >
        {userToken == null ? (
          // Auth screens
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator} 
            options={{ headerShown: false }} 
          />
        ) : (
          // App screens
          <>
            <Stack.Screen 
              name="Main" 
              component={TabNavigator} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen} 
              options={({ route }) => ({ 
                title: route.params?.contactName || t('messages.title'),
              })} 
            />
            <Stack.Screen 
              name="AddContact" 
              component={AddContactScreen} 
              options={{ title: t('contacts.addContact') }} 
            />
            <Stack.Screen 
              name="EditContact" 
              component={EditContactScreen} 
              options={{ title: t('contacts.editContact') }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 