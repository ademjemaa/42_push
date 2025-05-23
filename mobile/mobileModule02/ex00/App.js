import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

// Import components
import TopBar from './src/components/TopBar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleSearch = (text) => {
    setSelectedLocation({
      name: text,
      admin1: null,
      country: null
    });
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setPermissionDenied(true);
        Alert.alert(
          "Permission Denied", 
          "We don't have access to your location. You can search for a city instead.",
          [{ text: "OK" }]
        );
        return;
      }

      setPermissionDenied(false);
      
      const locationData = await Location.getCurrentPositionAsync({});
      
      setSelectedLocation({
        name: 'Current Location',
        admin1: null,
        country: null,
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        isCurrentLocation: true
      });
    } catch (error) {
      setErrorMsg(`Error getting location: ${error.message}`);
      Alert.alert("Error", `Could not get location: ${error.message}`);
    }
  };

  const handleLocation = () => {
    getLocation();
  };

  useEffect(() => {
    async function unlockOrientation() {
      await ScreenOrientation.unlockAsync();
    }
    unlockOrientation();
    
    getLocation();
  }, []);
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="dark-content" backgroundColor="#f0f0f0" />
          
          <TopBar onSearch={handleSearch} onLocation={handleLocation} />
          
          {permissionDenied && (
            <View style={styles.permissionBanner}>
              <Text style={styles.permissionText}>Location access denied. Please search for a city instead.</Text>
            </View>
          )}
          
          <View style={styles.content}>
            <AppNavigator selectedLocation={selectedLocation} />
          </View>
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
  },
  permissionBanner: {
    backgroundColor: '#ffeb3b',
    padding: 10,
    alignItems: 'center',
  },
  permissionText: {
    color: '#333',
    fontSize: 14,
  },
});
