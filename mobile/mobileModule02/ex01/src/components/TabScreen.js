import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * TabScreen component for displaying weather content
 * @param {Object} props - Component props
 * @param {string} props.tabName - Name of the tab
 * @param {string} props.displayText - Text to display
 */
const TabScreen = ({ tabName, displayText }) => (
  <View style={styles.tabContent}>
    <Text style={styles.tabText}>{tabName}</Text>
    {displayText && <Text style={styles.displayText}>{displayText}</Text>}
  </View>
);

const styles = StyleSheet.create({
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

export default TabScreen; 