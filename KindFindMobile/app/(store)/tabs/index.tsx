import { Text, View, StyleSheet, FlatList, TextInput, Image, Pressable } from 'react-native';
import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import ItemCard from '@/components/ItemCard';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

//sets up for the profile and photos types for the store home screen
type Profile = {
  id: string;
  role: "user" | "store";
  display_name: string;
  store_name: string | null;
  opening_times: string | null;
  address: string | null;
  created_at: string;
  store_id: string | null;
};

type Photo = {
  id: number;
  created_at: string;
  image_url: string;
  title: string;
  description: string | null;
  size: number;
  location: string | null;
  price: number;
  user_id: string;
  store_id: string;
  tags: string[];
  reserved: boolean;
  reserved_by: string | null;
  reserved_at: string | null;
};

// StoreHomeScreen component displays the store's reserved items and allows shop staff to manage them
export default function StoreHomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [storeProfile, setStoreProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState(items);

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // Load store profile
  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error) setStoreProfile(data);
    })();
  }, [user]);

  // Load reserved items
  useEffect(() => {
    if (!storeProfile) return;

    (async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("store_id", storeProfile.store_id)
        .eq("reserved", true)
        .is("collected_at", null);
      if (!error) setItems(data);
    })();
  }, [storeProfile]);

  // Filter reserved items by search
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredItems(
      items.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.tags?.some((tag: string) => tag.toLowerCase().includes(q)) ||
        item.size?.toString().includes(q)
      )
    );
  }, [searchQuery, items]);

  // Listen for real-time updates to reservations for this store
  useEffect(() => {
    if (!storeProfile?.store_id) {
      console.log("No store_id found yet, waiting...");
      return;
    }

    console.log("Listening for reservations at Store:", storeProfile.store_id);

    const channel = supabase
      .channel('store-reservations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'photos',
          filter: `store_id=eq.${storeProfile.store_id}`,
        },
        (payload) => {
          const isNewReservation =
            payload.new.reserved === true &&
            payload.new.reservation_number &&
            !payload.old.reservation_number;

          const isNoLongerReserved =
            payload.old.reserved === true &&
            payload.new.reserved === false; 

          if (isNewReservation) {
            triggerStoreNotification(payload.new);
            setItems(current => [payload.new, ...current.filter(i => i.id !== payload.new.id)]);
          } else if (isNoLongerReserved) {
            // Remove it from the list instantly
            setItems(current => current.filter(i => i.id !== payload.new.id));
          } else {
            setItems(current =>
              current.map(i => i.id === payload.new.id ? payload.new : i)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeProfile]);

  // Function to show the alert to the shop staff
  const triggerStoreNotification = async (item: any) => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 New Reservation!",
        body: `Remove "${item.title}" from the shop floor.`,
        data: { itemId: item.id },
      },
      trigger: null,
    });
  };


  return (
    <Screen>
      <View style={styles.container}>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search reserved items"
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Reserved Items Grid */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ rowGap: 16 }}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              showReservedInfo={true}
              onPress={() => router.push({
                pathname: "/(store)/item/[id]",
                params: { id: item.id.toString() }
              })
              }
            />
          )}
        />

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  // Search bar
  searchWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    color: "#000",
  }
})