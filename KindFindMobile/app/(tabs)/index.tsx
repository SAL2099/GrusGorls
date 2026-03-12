import { Text, View, StyleSheet } from 'react-native'; // Import Text, View, and StyleSheet components from react-native
import Screen from '../../components/Screen'; // Import the Screen component from the components directory
import HomeScreen from '../../components/homeScreen'; //Import the home screen scrollable elements

export default function Home() { // Define and export the HomeScreen component
  return ( // Render the Screen component, which provides a consistent background and layout for the screen
    <Screen> 
      <View style={styles.container}> 
        <HomeScreen />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ // Create a StyleSheet for the HomeScreen component
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
  },
});