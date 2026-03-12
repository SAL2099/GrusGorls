import { Text, View, StyleSheet } from 'react-native'; // Import Text, View, and StyleSheet components from react-native
import Screen from "../components/Screen";

export default function StoreHomeScreen() { // Define and export the HomeScreen component
  return ( // Render the Screen component, which provides a consistent background and layout for the screen
    <Screen> 
      <View style={styles.container}> 
        <Text>Store Dashboard</Text>
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