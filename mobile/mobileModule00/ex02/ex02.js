import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function Calculator() {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
      setScreenHeight(window.height);
      setIsLandscape(window.width > window.height);
    });

    async function enableAllOrientations() {
      await ScreenOrientation.unlockAsync();
    }
    enableAllOrientations();

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleButtonPress = (buttonValue) => {
    console.log(`Button pressed: ${buttonValue}`);
  };

  const renderButtons = () => {
    const buttons = isLandscape 
      ? [
          ['7', '8', '9', 'C', 'AC'],
          ['4', '5', '6', '+', '-'],
          ['1', '2', '3', '×', '÷'],
          ['0', '.', '=', '^2', ''],
        ]
      : [
          ['7', '8', '9', 'C', 'AC'],
          ['4', '5', '6', '+', '-'],
          ['1', '2', '3', '×', '÷'],
          ['00', '0', '.', '=', ''],
        ];

    return buttons.map((row, rowIndex) => (
      <View key={`row-${rowIndex}`} style={styles.row}  >
        {row.map((button, buttonIndex) => {
          if (button === '') return <View key={`empty-${buttonIndex}`} style={styles.button} />;
          
          const isOperator = ['+', '-', '×', '÷', '=', 'C', 'AC', '^2'].includes(button);
          const isDanger = ['C', 'AC'].includes(button);
          
          return (
            <TouchableOpacity
              key={`button-${buttonIndex}`}
              style={[
                styles.button,
                isOperator ? styles.operatorButton : styles.numberButton,
                isDanger ? styles.dangerButton : {},
                button === '=' ? styles.equalsButton : {},
              ]}
              onPress={() => handleButtonPress(button)}
            >
              <Text style={[
                styles.buttonText,
                isOperator ? styles.operatorText : styles.numberText,
                isDanger ? styles.dangerText : {},
              ]}>
                {button}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Calculator</Text>
        </View>

        {/* Display */}
        <View style={[styles.display, isLandscape && styles.landscapeDisplay]}>
          <Text style={styles.expression} numberOfLines={1} ellipsizeMode="head">
            0
          </Text>
          <Text style={styles.result} numberOfLines={1} ellipsizeMode="head">
            0
          </Text>
        </View>

        {/* Buttons */}
        <View style={[styles.buttonsContainer, isLandscape && styles.landscapeButtons]}>
          {renderButtons()}
        </View>
        
      </SafeAreaView>
    </SafeAreaProvider>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#303030',
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196f3',  // Blue header as requested
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  display: {
    flex: 0.25,
    backgroundColor: '#252525',
    padding: 15,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  landscapeDisplay: {
    flex: 0.3,
  },
  expression: {
    color: '#e0e0e0',
    fontSize: 28,
    marginBottom: 8,
  },
  result: {
    color: '#4caf50',
    fontSize: 24,
  },
  buttonsContainer: {
    flex: 0.75,
    backgroundColor: '#303030',
    padding: 10,
  },
  landscapeButtons: {
    flex: 0.7,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  numberButton: {
    backgroundColor: '#424242',
  },
  operatorButton: {
    backgroundColor: '#616161',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  equalsButton: {
    backgroundColor: '#2196f3',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  numberText: {
    color: '#ffffff',
  },
  operatorText: {
    color: '#ffffff',
  },
  dangerText: {
    color: '#ffffff',
  },
});