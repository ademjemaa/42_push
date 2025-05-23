import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import SuggestionItem from './SuggestionItem';

/**
 * TopBar component with search functionality
 * @param {Object} props - Component props
 * @param {Function} props.onSearch - Function to call when search is performed
 * @param {Function} props.onLocation - Function to call when location button is pressed
 */
const TopBar = ({ onSearch, onLocation }) => {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchGeocodingData = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name: query,
          count: 100
        }
      });
      setSuggestions(response.data.results || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching geocoding data:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchText.trim()) {
        fetchGeocodingData(searchText);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500); // Debounce for better performance

    return () => clearTimeout(debounceTimeout);
  }, [searchText]);

  const handleSelectLocation = (location) => {
    setSearchText(location.name);
    setShowSuggestions(false);
    onSearch(location);
  };

  return (
    <View style={styles.topBarContainer}>
      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {loading ? (
            <ActivityIndicator size="small" color="#3498db" style={styles.searchIcon} />
          ) : (
            <TouchableOpacity 
              style={styles.searchButton} 
              onPress={() => {
                if (searchText.trim()) {
                  setShowSuggestions(false);
                  onSearch({ name: searchText });
                }
              }}
            >
              <MaterialIcons name="search" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.locationButton} onPress={onLocation}>
          <MaterialIcons name="my-location" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>
      
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={({ item }) => (
              <SuggestionItem item={item} onSelect={handleSelectLocation} />
            )}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  topBarContainer: {
    backgroundColor: '#f0f0f0',
    zIndex: 10,
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
  searchIcon: {
    marginRight: 8,
  },
  locationButton: {
    marginLeft: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 15,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 300,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default TopBar; 