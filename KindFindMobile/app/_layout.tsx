import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import { decode as atob, encode as btoa } from "base-64";

if (!global.atob) global.atob = atob;
if (!global.btoa) global.btoa = btoa;

import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const router = useRouter();
  const segments = useSegments();

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

  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!signedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (signedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [signedIn, ready, segments]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
