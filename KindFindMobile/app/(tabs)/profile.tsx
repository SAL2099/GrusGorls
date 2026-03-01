import { Text, View } from 'react-native'; // Import Text and View components from react-native
import Screen from '../../components/Screen'; // Import the Screen component from the components directory

export default function ProfileScreen() { // Define and export the ProfileScreen component
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Profile</Text>
      </View>
    </Screen>
  );
}