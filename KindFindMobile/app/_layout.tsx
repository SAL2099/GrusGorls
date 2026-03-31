import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import { decode as atob, encode as btoa } from "base-64";
import { Platform } from "react-native";

if (!global.atob) global.atob = atob;
if (!global.btoa) global.btoa = btoa;

import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log("Notification received at:", new Date().toLocaleTimeString());
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});



export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('pickup-reminders', {
        name: 'Pickup Reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
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
    let channel: any = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Clean up previous channel whenever auth state changes
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      if (session?.user) {
        channel = supabase
          .channel(`user-pickup-${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'photos',
              filter: `reserved_by=eq.${session.user.id}`,
            },
            (payload) => {
              const isNowReady = payload.new.ready_for_pickup_at && !payload.old.ready_for_pickup_at;
              if (isNowReady) {
                Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Ready for Pickup! 🎁",
                    body: `Your item "${payload.new.title}" is ready. You have 48 hours!`,
                    sound: true,
                  },
                  trigger: null,
                });
              }
            }
          )
          .subscribe();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isResettingPassword = (segments as string[]).includes("reset-password");

    if (!signedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (signedIn && inAuthGroup && !isResettingPassword) {
      router.replace("/(tabs)");
    }
  }, [signedIn, ready, segments]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      setTimeout(() => {
        console.log("Redirecting to profile...");
        router.replace("/(tabs)/profile");
      }, 500);
    });

    return () => subscription.remove();
  }, []);
  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );


}