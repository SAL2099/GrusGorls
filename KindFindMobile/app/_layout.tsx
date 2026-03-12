import "react-native-url-polyfill/auto"; // import polyfull for URL and URLSearchParams to ensure compatibility across platforms
import "react-native-get-random-values"; //import polyfill for crypto.getRandomValues, which is used by uuid to generate unique IDs
import { decode as atob, encode as btoa } from "base-64"; //import base64 encoding and decoding functions

if (!global.atob) global.atob = atob; // If the global atob function is not defined, assign the imported atob function to it
if (!global.btoa) global.btoa = btoa; // If the global btoa function is not defined, assign the imported btoa function to it

import { Stack, useRouter, useSegments } from "expo-router"; // Import Stack for navigation
import { useEffect, useState } from "react"; // Import useEffect and useState hooks for managing component state and side effects
import { supabase } from "./lib/supabase"; //Import supabase client

//Root layout for all app screens, deals with login logic and route protection.
export default function RootLayout() { 
  const [ready, setReady] = useState(false); // State to track if the auth status has been determined
  const [signedIn, setSignedIn] = useState(false); // State to track if the user is signed in or not
  
  const router = useRouter();  // Get the router object from expo-router to programmatically navigate between screens
  const segments = useSegments(); // Get the current route segments

  // Checks the state of users session on app load
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSignedIn(!!data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  //Redirect users based on their auth status and the route they are trying to access
  useEffect(() => {
    if (!ready) return;

    // tells us what screen the user is trying to access, e.g. ['(auth)', 'login'] or ['(tabs)', 'map']
    const inAuthGroup = segments[0] === '(auth)';

    if (!signedIn && !inAuthGroup) {
      // User is logged out but trying to access the app -> send to login
      router.replace("/(auth)/login");
    } else if (signedIn && inAuthGroup) {
      // User is logged in but stuck on the auth screens -> send to app
      router.replace("/(tabs)");
    }
  }, [signedIn, ready, segments]);

  if (!ready) return null;

  // Render the screen based on the route 
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />

      <Stack.Screen 
        name="listing/[id]" 
        options={{ 
          headerShown: true, 
          headerStyle: { backgroundColor: "#121C0C" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "900" },
          headerBackTitle: "Back"
        }} 
      />
    </Stack>
  );
}