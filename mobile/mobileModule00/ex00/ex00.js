import React from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, Alert } from 'react-native';

const App = () => {
  const handlePress = () => {
    console.log("Button pressed");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centeredContent}>
        <Text style={styles.text}>Welcome to our app!</Text>
        <View style={styles.buttonContainer}>
          <Button title="Press Me" onPress={handlePress} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '60%',
  },
});

export default App;
