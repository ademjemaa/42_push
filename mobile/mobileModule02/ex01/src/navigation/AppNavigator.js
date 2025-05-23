import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import TabScreen from '../components/TabScreen';

const Tab = createMaterialTopTabNavigator();

/**
 * Main tab navigation for the app
 * @param {Object} props - Component props
 * @param {Object} props.selectedLocation - Selected location data
 */
function AppNavigator({ selectedLocation }) {
  const displayText = selectedLocation ? 
    selectedLocation.isCurrentLocation ?
      `Current Location - Lat: ${selectedLocation.latitude.toFixed(4)}, Lon: ${selectedLocation.longitude.toFixed(4)}` :
      `${selectedLocation.name}, ${selectedLocation.admin1 || 'N/A'}, ${selectedLocation.country || 'N/A'}` : 
    '';

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
        {() => <TabScreen tabName="Currently" displayText={displayText} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Today"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="today" color={color} size={24} />
          ),
        }}
      >
        {() => <TabScreen tabName="Today" displayText={displayText} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Weekly"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="calendar-view-week" color={color} size={24} />
          ),
        }}
      >
        {() => <TabScreen tabName="Weekly" displayText={displayText} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default AppNavigator; 