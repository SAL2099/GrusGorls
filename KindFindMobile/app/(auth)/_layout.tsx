import { Stack } from "expo-router";

/*Page is needed for the route, but all the auth logic is handled in the root layout, 
so it just returns an empty Stack here in order for it to work */

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}