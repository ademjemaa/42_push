import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import { fetchWeatherData, getWeatherDescription, formatDate } from '../utils/weatherApi';

/**
 * WeeklyWeather component for displaying weekly weather forecast
 * @param {Object} props - Component props
 * @param {Object} props.location - Location object with coordinates
 */
const WeeklyWeather = ({ location }) => {
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
        console.error('Error in WeeklyWeather:', err);
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

  if (!weatherData || !weatherData.daily) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No weather data available</Text>
      </View>
    );
  }

  const { daily } = weatherData;
  
  // Create daily data for the next 7 days
  const dailyData = [];
  
  for (let i = 0; i < 7; i++) {
    dailyData.push({
      id: i.toString(),
      date: daily.time[i],
      weatherCode: daily.weather_code[i],
      maxTemp: daily.temperature_2m_max[i],
      minTemp: daily.temperature_2m_min[i]
    });
  }

  const locationName = location.isCurrentLocation 
    ? `Current Location (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})` 
    : `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}${location.country ? `, ${location.country}` : ''}`;

  return (
    <View style={styles.container}>
      <Text style={styles.locationName}>{locationName}</Text>
      
      <FlatList
        data={dailyData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.dailyItem}>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
            <View style={styles.weatherDetails}>
              <Text style={styles.temperature}>
                {Math.round(item.minTemp)}°C - {Math.round(item.maxTemp)}°C
              </Text>
              <Text style={styles.description}>
                {getWeatherDescription(item.weatherCode)}
              </Text>
            </View>
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
  dailyItem: {
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
  date: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  temperature: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  description: {
    fontSize: 16,
    color: '#666',
    flex: 2,
    textAlign: 'right',
  },
});

export default WeeklyWeather; 