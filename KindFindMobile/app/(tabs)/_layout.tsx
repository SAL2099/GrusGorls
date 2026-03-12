import 'react-native-url-polyfill/auto'; // import polyfull for URL and URLSearchParams to ensure compatibility across platforms
import 'react-native-get-random-values'; //import polyfill for crypto.getRandomValues, which is used by uuid to generate unique IDs
import { decode as atob, encode as btoa } from 'base-64'; //import base64 encoding and decoding functions

if (!global.atob) global.atob = atob; // If the global atob function is not defined, assign the imported atob function to it
if (!global.btoa) global.btoa = btoa; // If the global btoa function is not defined, assign the imported btoa function to it

import { Tabs } from 'expo-router'; //Import tabs conponent from expo for nav
import { View } from 'react-native'; // Import View components from react-native
import Header from '../components/Header'; //Imports header 
import TabIcon from '../components/TabIcons'; //Imports logic for icons

/* This is where things that are common to all the tabs go, like the header and the tab bar. 
The individual screens are in their own files (index.tsx, map.tsx, profile.tsx, upload.tsx)
and are rendered inside the Tabs component. */

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#192710' }}>
      <Header />

      <Tabs // This is the Tabs component from expo-router, which renders the tab bar and the screens for each tab.
        screenOptions={{
          headerShown: false, //Hides the default header so we have our own custom header
          tabBarShowLabel: false, //Hides the labels under the icons
          tabBarStyle: {
            height: 70,
            paddingBottom: 10,
            backgroundColor: '#121C0C',
            borderTopWidth: 0, //removes thin line
            elevation: 0, //Android shadow
            shadowOpacity: 0, //iOS shadow
          },

          tabBarIconStyle: {
            marginTop: 15, //position of the icons
          },
        }}
      >
        <Tabs.Screen
          name="index" //Home page
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require('../../assets/icons/homeActive.png')} //active icon when the tab is selected
                inactiveIcon={require('../../assets/icons/home.png')} //inactive icon when the tab is not selected
              />
            ),
          }}
        />

        <Tabs.Screen
          name="map" //Map page
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require('../../assets/icons/mapActive.png')} //active icon when the tab is selected
                inactiveIcon={require('../../assets/icons/map.png')} //inactive icon when the tab is not selected
              />
            ),
          }}
        />

        <Tabs.Screen
          name="shared/upload" //Upload page
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require('../../assets/icons/uploadActive.png')} //active icon when the tab is selected
                inactiveIcon={require('../../assets/icons/upload.png')} //inactive icon when the tab is not selected
              />
            ),
          }}
        />

        <Tabs.Screen
          name="shared/profile" //Profile page
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require('../../assets/icons/ProfileActive.png')} //active icon when the tab is selected
                inactiveIcon={require('../../assets/icons/Profile.png')} //inactive icon when the tab is not selected
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}