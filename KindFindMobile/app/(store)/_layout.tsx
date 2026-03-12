import { Tabs } from "expo-router";
import { View } from "react-native";
import Header from "../../components/Header";
import TabIcon from "../../components/TabIcons";

export default function StoreLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#192710" }}>
      <Header />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 70,
            paddingBottom: 10,
            backgroundColor: "#121C0C",
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarIconStyle: { marginTop: 15 },
        }}
      >
        {/* Store Home */}
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require("../../assets/icons/homeActive.png")}
                inactiveIcon={require("../../assets/icons/home.png")}
              />
            ),
          }}
        />

        {/* Upload (alias file inside (store)) */}
        <Tabs.Screen
          name="upload"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require("../../assets/icons/uploadActive.png")}
                inactiveIcon={require("../../assets/icons/upload.png")}
              />
            ),
          }}
        />

        {/* Profile (alias file inside (store)) */}
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                activeIcon={require("../../assets/icons/ProfileActive.png")}
                inactiveIcon={require("../../assets/icons/Profile.png")}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
