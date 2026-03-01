import { Text, View } from 'react-native'; // Import Text and View components from react-native
import Screen from '../../components/Screen'; // Import the Screen component from the components directory

export default function MapScreen() { // Define and export the MapScreen component
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Map Screen</Text>
      </View>
    </Screen>
  );
}