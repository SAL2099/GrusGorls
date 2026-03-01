import { Text, View } from 'react-native'; // Import Text and View components from react-native

export default function HomeScreen() { // Define and export the HomeScreen component
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to KindFind</Text>
    </View>
  );
}