import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const TopBar = ({ onSearch, onLocation }) => {
  const [searchText, setSearchText] = useState('');

  const handleSearch = () => {
    if (searchText.trim()) {
      onSearch(searchText);
    }
  };

  return (
    <View style={styles.topBar}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <MaterialIcons name="search" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.locationButton} onPress={onLocation}>
        <MaterialIcons name="my-location" size={24} color="#3498db" />
      </TouchableOpacity>
    </View>
  );
};

const TabScreen = ({ tabName, displayText }) => (
  <View style={styles.tabContent}>
    <Text style={styles.tabText}>{tabName}</Text>
    {displayText && <Text style={styles.displayText}>{displayText}</Text>}
  </View>
);

const Tab = createMaterialTopTabNavigator();

function MyTabs({ searchTerm }) {
  return (
    <Tab.Navigator
      initialRouteName="Currently"
      tabBarPosition="bottom"
      screenOptions={{
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: 'gray',
        tabBarShowIcon: true,
        tabBarIndicatorStyle: { backgroundColor: '#3498db' },
        tabBarStyle: {
          backgroundColor: 'white',
          height: 70,
          paddingBottom: 10,
          paddingTop: 5,
        },
        swipeEnabled: true,
        animationEnabled: true,
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarIconStyle: {
          marginBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
          marginBottom: 4,
        },
        headerShown: false
      }}
    >
      <Tab.Screen 
        name="Currently"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="access-time" color={color} size={24} />
          ),
        }}
      >
        {() => <TabScreen tabName="Currently" displayText={searchTerm} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Today"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="today" color={color} size={24} />
          ),
        }}
      >
        {() => <TabScreen tabName="Today" displayText={searchTerm} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Weekly"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="calendar-view-week" color={color} size={24} />
          ),
        }}
      >
        {() => <TabScreen tabName="Weekly" displayText={searchTerm} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (text) => {
    setSearchTerm(text);
  };

  const handleLocation = () => {
    setSearchTerm('Geolocation');
  };

  useEffect(() => {
    async function unlockOrientation() {
      await ScreenOrientation.unlockAsync();
    }
    unlockOrientation();
  }, []);
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="dark-content" backgroundColor="#f0f0f0" />
          
          <TopBar onSearch={handleSearch} onLocation={handleLocation} />
          
          <View style={styles.content}>
            <MyTabs searchTerm={searchTerm} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
  },
  searchButton: {
    padding: 8,
  },
  locationButton: {
    marginLeft: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  displayText: {
    fontSize: 18,
    color: '#666',
  },
});
