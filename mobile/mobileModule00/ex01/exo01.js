import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet } from 'react-native';

const App = () => {
  // Define the state to track the text
  const [text, setText] = useState("Welcome to our app!");

  const handlePress = () => {
    // Toggle between the initial text and "Hello World!"
    setText(prevText => prevText === "Welcome to our app!" ? "Hello World!" : "Welcome to our app!");
    console.log("Button pressed");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centeredContent}>
        <Text style={styles.text}>{text}</Text>
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
