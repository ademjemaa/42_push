import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import { fetchWeatherData, getWeatherDescription, formatTime } from '../utils/weatherApi';

/**
 * TodayWeather component for displaying hourly weather for today
 * @param {Object} props - Component props
 * @param {Object} props.location - Location object with coordinates
 */
const TodayWeather = ({ location }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getWeatherData = async () => {
      if (!location) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { latitude, longitude } = location;
        const data = await fetchWeatherData(latitude, longitude);
        setWeatherData(data);
      } catch (err) {
        setError('Failed to fetch weather data. Please try again.');
        console.error('Error in TodayWeather:', err);
      } finally {
        setLoading(false);
      }
    };

    getWeatherData();
  }, [location]);

  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Please select a location</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.message}>Loading weather data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (!weatherData || !weatherData.hourly) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No weather data available</Text>
      </View>
    );
  }

  const { hourly } = weatherData;
  
  // Get the current hour index to only show the remaining hours of today (next 24 hours)
  const now = new Date();
  const currentHourIndex = now.getHours();
  
  // Create hourly data for the next 24 hours
  const hourlyData = [];
  const today = new Date().toISOString().split('T')[0]; // Get today's date
  
  for (let i = 0; i < 24; i++) {
    const index = i;
    hourlyData.push({
      id: index.toString(),
      time: hourly.time[index],
      temperature: hourly.temperature_2m[index],
      weatherCode: hourly.weather_code[index],
      windSpeed: hourly.wind_speed_10m[index]
    });
  }

  const locationName = location.isCurrentLocation 
    ? `Current Location (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})` 
    : `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}${location.country ? `, ${location.country}` : ''}`;

  return (
    <View style={styles.container}>
      <Text style={styles.locationName}>{locationName}</Text>
      
      <FlatList
        data={hourlyData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.hourlyItem}>
            <Text style={styles.time}>{formatTime(item.time)}</Text>
            <Text style={styles.temperature}>{Math.round(item.temperature)}°C</Text>
            <Text style={styles.description}>{getWeatherDescription(item.weatherCode)}</Text>
            <Text style={styles.windSpeed}>{Math.round(item.windSpeed)} km/h</Text>
          </View>
        )}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  message: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  errorMessage: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  locationName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    flex: 1,
  },
  hourlyItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  temperature: {
    fontSize: 20,
    marginBottom: 4,
  },
  description: {
    fontSize: 16,
    marginBottom: 4,
  },
  windSpeed: {
    fontSize: 14,
    color: '#666',
  },
});

export default TodayWeather; 