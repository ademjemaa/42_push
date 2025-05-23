import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

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