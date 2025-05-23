import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

/**
 * SuggestionItem component for displaying location suggestions
 * @param {Object} props - Component props
 * @param {Object} props.item - Location data
 * @param {Function} props.onSelect - Function to call when item is selected
 */



const SuggestionItem = ({ item, onSelect }) => {
  
  const countryCodeToFlag = (countryCode) => {
    if (!countryCode) return '';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };
  return (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => onSelect(item)}
    >
      <Text style={styles.flagEmoji}>
        {countryCodeToFlag(item.country_code)}
      </Text>
      <Text style={styles.cityName}>{item.name}</Text>
      <Text style={styles.regionText}>{item.admin1 || 'N/A'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: 16,
    marginRight: 10,
    width: 30,
    textAlign: 'center',
  },
  cityName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  regionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
});

export default SuggestionItem; 