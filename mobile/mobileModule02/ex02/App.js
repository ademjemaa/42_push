import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Text, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import axios from 'axios';

import TopBar from './src/components/TopBar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (location) => {
    // If it's already a full location object with coordinates, use it directly
    if (location.latitude && location.longitude) {
      setSelectedLocation(location);
      return;
    }

    // Otherwise, we need to geocode the location name
    try {
      setLoading(true);
      
      const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name: location.name,
          count: 1
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        const geoResult = response.data.results[0];
        
        setSelectedLocation({
          name: geoResult.name,
          admin1: geoResult.admin1 || null,
          country: geoResult.country || null,
          latitude: geoResult.latitude,
          longitude: geoResult.longitude
        });
      } else {
        Alert.alert("Location Not Found", "Could not find the specified location. Please try another search.");
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      Alert.alert("Error", "Failed to search for location. Please try again.");
    } finally {
      setLoading(false);
    }
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
      setLoading(true);
      
      try {
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
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLoading(false);
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
              <Text style={styles.permissionText}>Only city searches allowed</Text>
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
