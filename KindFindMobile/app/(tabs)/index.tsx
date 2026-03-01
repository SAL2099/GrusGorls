import { Text, View } from 'react-native';
import Screen from '../../components/Screen';

export default function HomeScreen() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Welcome to KindFind</Text>
      </View>
    </Screen>
  );
}
