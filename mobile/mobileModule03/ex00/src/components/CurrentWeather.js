import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { fetchWeatherData, getWeatherDescription } from '../utils/weatherApi';

/**
 * CurrentWeather component for displaying current weather
 * @param {Object} props - Component props
 * @param {Object} props.location - Location object with coordinates
 */
const CurrentWeather = ({ location }) => {
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
        console.error('Error in CurrentWeather:', err);
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

  if (!weatherData || !weatherData.current) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No weather data available</Text>
      </View>
    );
  }

  const { current } = weatherData;
  const locationName = location.isCurrentLocation 
    ? `Current Location (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})` 
    : `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}${location.country ? `, ${location.country}` : ''}`;

  return (
    <View style={styles.container}>
      <Text style={styles.locationName}>{locationName}</Text>
      
      <View style={styles.weatherInfo}>
        <Text style={styles.temperature}>
          {Math.round(current.temperature_2m)}°C
        </Text>
        
        <Text style={styles.description}>
          {getWeatherDescription(current.weather_code)}
        </Text>
        
        <Text style={styles.windSpeed}>
          Wind: {Math.round(current.wind_speed_10m)} km/h
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
  },
  locationName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  weatherInfo: {
    alignItems: 'center',
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 24,
    marginBottom: 16,
  },
  windSpeed: {
    fontSize: 18,
    color: '#666',
  },
});

export default CurrentWeather; 