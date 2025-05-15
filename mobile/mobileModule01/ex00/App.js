import React, { useEffect } from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const CurrentlyScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabText}>Currently</Text>
  </View>
);

const TodayScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabText}>Today</Text>
  </View>
);

const WeeklyScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabText}>Weekly</Text>
  </View>
);

const Tab = createMaterialTopTabNavigator();

function MyTabs() {
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
        component={CurrentlyScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="access-time" color={color} size={24} />
          ),
        }}
      />
      <Tab.Screen 
        name="Today"
        component={TodayScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="today" color={color} size={24} />
          ),
        }}
      />
      <Tab.Screen 
        name="Weekly"
        component={WeeklyScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="calendar-view-week" color={color} size={24} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
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
          
          <View style={styles.content}>
            <MyTabs />
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
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});