import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';


export default function Calculator() {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');

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
    
    console.log(`button pressed - ${buttonValue}`);

    switch (buttonValue) {
      case 'AC':
        setExpression('');
        setResult('');
        break;

      case 'C':
        if (expression.length > 0) {
          const newExpression = expression.slice(0, -1);
          setExpression(newExpression);
          if (newExpression !== '') {
            calculateResult(newExpression);
          } else {
            setResult('');
          }
        }
        break;

      case '=':
        if (expression !== '') {
          calculateResult(expression, true);
        }
        break;

      case '^2':
        if (expression !== '') {
          try {
            const expressionToEvaluate = expression.replace(/×/g, '*').replace(/÷/g, '/');
            const evalResult = calculateSafely(expressionToEvaluate);
            if (evalResult === 'Error') {
              setResult('Error');
            } else {
              const squared = Math.pow(evalResult, 2);
              setExpression(squared.toString());
              setResult('');
            }
          } catch (e) {
            setResult('Error');
          }
        }
        break;

      default:
        let newExpression = expression;
        
        const lastChar = expression.slice(-1);
        const isLastCharOperator = ['+', '-', '×', '÷'].includes(lastChar);
        const isButtonOperator = ['+', '-', '×', '÷'].includes(buttonValue);

        if (isLastCharOperator && isButtonOperator) {
          newExpression = expression.slice(0, -1) + buttonValue;
        } else {
          newExpression += buttonValue;
        }
        
        setExpression(newExpression);
        
        if (!isButtonOperator) {
          calculateResult(newExpression);
        }
        break;
    }
  };

  const calculateSafely = (expr) => {
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/');

    if (expr.includes('/0')) {
      return 'Error';
    }

    try {
      const result = new Function('return ' + expr)();
      
      if (isNaN(result)) {
        return 'Error';
      }
      
      return result;
    } catch (error) {
      return 'Error';
    }
  };

  const calculateResult = (expr, isEquals = false) => {
    try {
      const lastChar = expr.slice(-1);
      if (['+', '-', '×', '÷'].includes(lastChar) && !isEquals) {
        return;
      }

      const calculatedResult = calculateSafely(expr);
      
      if (calculatedResult === 'Error') {
        setResult('Error');
      } else {
        const formattedResult = Number.isInteger(calculatedResult) 
          ? calculatedResult.toString() 
          : parseFloat(calculatedResult.toFixed(8)).toString();
        
        setResult(formattedResult);
        
        if (isEquals) {
          setExpression(formattedResult);
        }
      }
    } catch (error) {
      setResult('Error');
    }
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
      <View key={`row-${rowIndex}`} style={styles.row}>
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

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Calculator</Text>
        </View>

        {/* Display */}
        <View style={[styles.display, isLandscape && styles.landscapeDisplay]}>
          <Text style={styles.expression} numberOfLines={1} ellipsizeMode="head">
            {expression}
          </Text>
          <Text style={styles.result} numberOfLines={1} ellipsizeMode="head">
            {result}
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
    backgroundColor: '#252525',
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
  debugContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 5,
    maxHeight: 200,
  },
  debugText: {
    color: '#4caf50',
    fontSize: 10,
  },
});

