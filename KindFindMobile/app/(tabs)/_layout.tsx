import { Tabs } from 'expo-router';
import { View } from 'react-native';
import Header from '../../components/Header';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Header />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height: 70,
            paddingBottom: 10,
            backgroundColor: '#93E265',
          },
          tabBarActiveTintColor: '#f30678',
          tabBarInactiveTintColor: '#fff',
          tabBarIcon: () => null,

          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
          },
        }}
      />
    </View>
  );
}