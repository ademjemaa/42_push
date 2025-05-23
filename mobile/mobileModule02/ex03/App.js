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
  const [searchError, setSearchError] = useState(null);

  const handleSearch = async (location) => {
    // Clear previous search errors
    setSearchError(null);
    
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
          count: 100 // Get more results to check for exact matches
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        // Look for an exact match (case-insensitive)
        const exactMatch = response.data.results.find(
          city => city.name.toLowerCase() === location.name.toLowerCase()
        );
        
        if (exactMatch) {
          // Use exact match
          setSelectedLocation({
            name: exactMatch.name,
            admin1: exactMatch.admin1 || null,
            country: exactMatch.country || null,
            latitude: exactMatch.latitude,
            longitude: exactMatch.longitude
          });
        } else {
          // No exact match found, show error message
          setSearchError(`City "${location.name}" not found. Please check the spelling and try again.`);
        }
      } else {
        // No city found
        setSearchError(`No matches found for "${location.name}". Please try another city name.`);
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      // Show connection error
      setSearchError(`Connection error: Unable to search for "${location.name}". Please check your internet connection.`);
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
    // Clear search errors when switching to location
    setSearchError(null);
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
          
          {searchError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{searchError}</Text>
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
  errorBanner: {
    backgroundColor: '#ff5252',
    padding: 10,
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});
