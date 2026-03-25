import { Text, View, StyleSheet, FlatList, TextInput, Image, Pressable } from 'react-native';
import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import ItemCard from '@/components/ItemCard';
import { router } from 'expo-router';

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

        // console.log("PROFILE:", storeProfile);
        // console.log("STORE ID:", storeProfile?.store_id);
        // console.log("FETCHED ITEMS:", data);
        // console.log("ERROR:", error);

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
          columnWrapperStyle={{ gap: 12}}
          contentContainerStyle={{ rowGap: 16 }}
          renderItem={({ item }) => (
            <ItemCard 
              item={item}
              showReservedInfo={true}
              onPress={() => router.push({
                pathname: "/(store)/item/[id]",
                params: {id: item.id.toString()}
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
  }})