import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { decode as atob, encode as btoa } from 'base-64';

if (!global.atob) global.atob = atob;
if (!global.btoa) global.btoa = btoa;

import { Tabs } from 'expo-router';
import { View } from 'react-native';
import Header from '../../components/Header';
import TabIcon from '../../components/TabIcons';

// TabLayout component defines the layout for the main tab navigation of the app
export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#192710'}}>
      <Header />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 70,
            paddingBottom: 10,
            backgroundColor: '#121C0C',
            elevation: 0,
            shadowOpacity: 0,
            borderTopWidth: 0,
            borderTopColor: "transparent",

          },
          tabBarIconStyle: {
            marginTop: 15,
          },
        }}
      >
        {/* Home tab */}
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require('../../assets/icons/homeActive.png')}
                inactiveIcon={require('../../assets/icons/home.png')}
              />
            ),
          }}
        />

        {/* Map tab (alias file inside (tabs)) */}
        <Tabs.Screen
          name="map"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require('../../assets/icons/mapActive.png')}
                inactiveIcon={require('../../assets/icons/map.png')}
              />
            ),
          }}
        />

        {/* Upload tab (alias file inside (tabs)) */}
        <Tabs.Screen
          name="upload"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require('../../assets/icons/uploadActive.png')}
                inactiveIcon={require('../../assets/icons/upload.png')}
              />
            ),
          }}
        />

        {/* Profile tab (alias file inside (tabs)) */}
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require('../../assets/icons/ProfileActive.png')}
                inactiveIcon={require('../../assets/icons/Profile.png')}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
