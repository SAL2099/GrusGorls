import { Tabs } from 'expo-router';
import { View } from 'react-native';
import Header from '../../components/Header';

/* This is where things that are common to all the tabs go, like the header and the tab bar. 
The individual screens are in their own files (index.tsx, map.tsx, profile.tsx, upload.tsx)
and are rendered inside the Tabs component. */

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}> 
      <Header />  // render the Header component at the top of the screen

      <Tabs // This is the Tabs component from expo-router, which renders the tab bar and the screens for each tab.
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