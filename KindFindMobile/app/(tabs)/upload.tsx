import { Text, View } from 'react-native'; // Import Text and View components from react-native
import Screen from '../../components/Screen'; // Import the Screen component from the components directory

export default function ProfileUploadScreen() { // Define and export the ProfileUploadScreen component
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Profile Upload Screen</Text>
      </View>
    </Screen>
  );
}