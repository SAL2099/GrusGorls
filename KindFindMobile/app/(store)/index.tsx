import { Text, View, StyleSheet, FlatList, TextInput, Image } from 'react-native';
import Screen from "../../components/Screen";
import { supabase } from "../../lib/supabase";
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
        .eq("reserved", true);

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

  const renderItem = ({ item }: { item: Photo }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image_url }} style={styles.cardImage} />

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardPrice}>£{item.price}</Text>

      <Text style={styles.cardMeta}>
        Reserved at: {" "}
        {item.reserved_at
          ? new Date(item.reserved_at).toLocaleString()
          : "Not reserved"}
      </Text>

      <View style={styles.tagRow}>
        {item.tags?.map((tag, index) => (
          <View key={index} style={styles.tagChip}>
            <Text style={styles.tagChipText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );

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
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              showReservedInfo={true}
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
  },

  // Polaroid cards
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    marginHorizontal: 6,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 170,
    borderRadius: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    color: "#111",
  },
  cardPrice: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  cardMeta: {
    marginTop: 4,
    color: "#777",
    fontSize: 12,
  },

  // Tags
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },
  tagChip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "#CE6674",
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#CE6674",
  },
});