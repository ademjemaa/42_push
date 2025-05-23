import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalOrientation } from '../contexts/OrientationContext';
import Animated from 'react-native-reanimated';

/**
 * ResponsiveLayout - A component to standardize responsive layouts
 * 
 * @param {Object} props 
 * @param {React.ReactNode} props.children - The content to render
 * @param {Object} props.style - Additional styles for the container
 * @param {Object} props.contentContainerStyle - Additional styles for the ScrollView's content container
 * @param {boolean} props.scrollable - Whether the content should be scrollable (default: true)
 * @param {Array} props.safeAreaEdges - Edges to apply safe area insets to (default: ['top', 'right', 'bottom', 'left'])
 * @param {React.ReactNode} props.header - Optional header component to render at the top
 * @param {React.ReactNode} props.footer - Optional footer component to render at the bottom
 * @returns {React.ReactElement}
 */
const ResponsiveLayout = ({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
  safeAreaEdges = ['top', 'right', 'bottom', 'left'],
  header,
  footer
}) => {
  const { isPortrait, width, height } = useGlobalOrientation();

  const containerStyle = [
    styles.container,
    isPortrait ? styles.portraitContainer : styles.landscapeContainer,
    style
  ];

  const contentStyle = [
    styles.contentContainer,
    isPortrait ? styles.portraitContent : styles.landscapeContent,
    contentContainerStyle
  ];

  return (
    <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
      {header}
      
      {scrollable ? (
        <ScrollView 
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>
          {children}
        </View>
      )}
      
      {footer}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  portraitContainer: {
  },
  landscapeContainer: {
  },
  contentContainer: {
    padding: 0,
  },
  portraitContent: {
    paddingBottom: 24,
    paddingTop: 0,
  },
  landscapeContent: {
    paddingBottom: 16,
    paddingTop: 0,
  }
});

export default ResponsiveLayout; 