import { Text, View, StyleSheet } from 'react-native'; // Import Text and View components from react-native
import Screen from '../../components/Screen'; // Import the Screen component from the components directory

export default function ProfileScreen() { // Define and export the ProfileScreen component
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.text}>Profile</Text>
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