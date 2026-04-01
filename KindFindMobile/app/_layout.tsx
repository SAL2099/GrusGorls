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

const expiryTimers = new Map<number, ReturnType<typeof setTimeout>>();

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const itemId = data?.itemId;
    const type = data?.type;

    // If it's a warning or expiry
    if (itemId && (type === "warning" || type === "expired")) {
      const { data: dbData, error } = await supabase
        .from("photos")
        .select("collected_at, reserved")
        .eq("id", itemId)
        .single();

      // If already collected or no longer reserved, silence the notification
      if (!error && dbData && (dbData.collected_at !== null || dbData.reserved === false)) {
        console.log("Blocking notification for collected item.");
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
    }

    // Default behavior for everything else (or if item is still valid)
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

// Cancel any existing scheduled notifications for an item 
async function cancelItemNotifications(itemId: number) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.itemId === itemId) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// Schedule the 12h warning + expiry notification for one item
async function schedulePickupNotifications(item: { id: number; title: string; ready_for_pickup_at: string }) {
  const readyAt = new Date(item.ready_for_pickup_at);

  ////Actual Values
  //const expiresAt = new Date(readyAt.getTime() + 48 * 60 * 60 * 1000); // 48h
  //const warnAt   = new Date(expiresAt.getTime() - 12 * 60 * 60 * 1000); // 12h before expiry

  //TEST VALUES 
  const expiresAt = new Date(readyAt.getTime() + 1 * 60 * 1000);  // 1 minutes
  const warnAt = new Date(expiresAt.getTime() - 0.5 * 60 * 1000); // 0.5 min before expiry

  const now = new Date();

  // Cancel any stale notifications for this item first
  await cancelItemNotifications(item.id);

  // 12-hour warning (only if still in the future)
  if (warnAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "12 Hours Left!",
        body: `Don't forget to collect "${item.title}" — only 12 hours remaining!`,
        sound: true,
        data: { itemId: item.id, type: "warning" },
      },
      trigger: { type: "date", date: warnAt } as any,
    });
  }

  // Expiry notification (only if still in the future)
  if (expiresAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "❌ Reservation Expired",
        body: `Your reservation for "${item.title}" has expired and is back in the feed.`,
        sound: true,
        data: { itemId: item.id, type: "expired" },
      },
      trigger: { type: "date", date: expiresAt } as any,
    });
  }
}

//  Expire any overdue reservations for this user in Supabase 
async function expireOverdueReservations(userId: string) {
  // Fetch all active reservations that have a ready_for_pickup_at set
  const { data, error } = await supabase
    .from("photos")
    .select("id, title, ready_for_pickup_at")
    .eq("reserved_by", userId)
    .eq("reserved", true)
    .not("ready_for_pickup_at", "is", null);

  if (error || !data) return;

  const now = new Date();

  for (const item of data) {
    const expiresAt = new Date(
      // new Date(item.ready_for_pickup_at).getTime() + 48 * 60 * 60 * 1000 //Actual Values
      new Date(item.ready_for_pickup_at).getTime() + 1 * 60 * 1000  // 1 minute - TEST VALUE
    );

    if (now >= expiresAt) {
      // Reset back to the feed
      await supabase
        .from("photos")
        .update({
          reserved: false,
          reserved_by: null,
          reserved_at: null,
          reservation_number: null,
          ready_for_pickup_at: null,
          cancelled_by_store: false,
        })
        .eq("id", item.id);

      // Cancel any lingering scheduled notifications
      await cancelItemNotifications(item.id);
    }
  }
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const foregroundSubscription = Notifications.addNotificationReceivedListener(async (notification) => {
      // Use optional chaining to safely get data
      const data = notification.request.content.data;
      const itemId = data?.itemId;
      const type = data?.type;

      if (itemId && (type === "warning" || type === "expired")) {
        const { data: dbData, error } = await supabase
          .from("photos")
          .select("collected_at, reserved")
          .eq("id", itemId)
          .single();

        if (!error && dbData) {
          // Check if it's already been dealt with
          if (dbData.collected_at !== null || dbData.reserved === false) {
            console.log(`Dismissing stale notification for item ${itemId}`);

            // Get the string identifier explicitly
            const idToDismiss: string = notification.request.identifier;
            await Notifications.dismissNotificationAsync(idToDismiss);

            // Clean up future scheduled ones too
            await cancelItemNotifications(Number(itemId));
          }
        }
      }
    });

    return () => {
      foregroundSubscription.remove();
    };
  }, []);

  // Auth + notification channel setup 
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

  // Realtime listener: fires when store marks item ready 
  useEffect(() => {
    let channel: any = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      if (session?.user) {
        const userId = session.user.id;

        // Check for expired reservations every time the user is active
        expireOverdueReservations(userId);

        channel = supabase
          .channel(`user-pickup-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'photos',
              filter: `reserved_by=eq.${userId}`,
            },
            async (payload) => {
              const isNowReady =
                payload.new.ready_for_pickup_at &&
                !payload.old.ready_for_pickup_at;

              const isNowExpired =
                payload.old.reserved === true &&
                payload.new.reserved === false;

              const isCancelledByStore =
                payload.new.cancelled_by_store === true &&
                payload.old.cancelled_by_store !== true;

              if (isNowReady) {
                // Immediate "ready" notification
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Ready for Pickup! 🎁",
                    body: `Your item "${payload.new.title}" is ready. You have 48 hours to collect!`,
                    sound: true,
                    data: { itemId: payload.new.id, type: "ready" },
                  },
                  trigger: null, // immediate
                });

                // Schedule the 12h warning + expiry notifications
                await schedulePickupNotifications({
                  id: payload.new.id,
                  title: payload.new.title,
                  ready_for_pickup_at: payload.new.ready_for_pickup_at,
                });

                scheduleExpiryTimeout({
                  id: payload.new.id,
                  title: payload.new.title,
                  ready_for_pickup_at: payload.new.ready_for_pickup_at,
                }, userId);

              }
              if (isNowExpired) {
                router.replace("/(tabs)/profile");
              }

              if (isCancelledByStore) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Reservation Cancelled 😞",
                    body: `Sorry, "${payload.new.title}" is no longer available and has been removed from your reservations.`,
                    sound: true,
                    data: { itemId: payload.new.id, type: "cancelled" },
                  },
                  trigger: null,
                });
                router.replace("/(tabs)/profile");
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

  function scheduleExpiryTimeout(item: { id: number; title: string; ready_for_pickup_at: string }, userId: string) {
    // Clear any existing timer for this item
    if (expiryTimers.has(item.id)) {
      clearTimeout(expiryTimers.get(item.id)!);
    }

    const expiresAt = new Date(
      new Date(item.ready_for_pickup_at).getTime() + 1 * 60 * 1000 // swap back to 48 * 60 * 60 * 1000 //TEST VALUE
    );
    const msUntilExpiry = expiresAt.getTime() - Date.now();

    if (msUntilExpiry <= 0) {
      // Already expired, handle immediately
      expireOverdueReservations(userId);
      return;
    }

    const timer = setTimeout(async () => {
      await expireOverdueReservations(userId);
      expiryTimers.delete(item.id);
    }, msUntilExpiry);

    expiryTimers.set(item.id, timer);
  }


  // This catches cases where the app was closed when expiry happened
  useEffect(() => {
    if (!signedIn) return;

    async function syncOnOpen() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;

      // Expire any overdue reservations
      await expireOverdueReservations(userId);

      // Re-schedule notifications for all still-active reservations
      //    (handles cases where the user reinstalled or cleared notifications)
      const { data, error } = await supabase
        .from("photos")
        .select("id, title, ready_for_pickup_at")
        .eq("reserved_by", userId)
        .eq("reserved", true)
        .not("ready_for_pickup_at", "is", null);

      if (!error && data) {
        for (const item of data) {
          await schedulePickupNotifications(item);
          scheduleExpiryTimeout(item, userId);
        }
      }
    }

    syncOnOpen();
  }, [signedIn]);


  //Navigation guard
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

  //Handle tapping a notification go to profile
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      setTimeout(() => router.replace("/(tabs)/profile"), 500);
    });
    return () => subscription.remove();
  }, []);

  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}