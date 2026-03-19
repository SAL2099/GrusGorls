// get info for items
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";

// get locations of shops from supabase
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export default function ItemDetails() {
  const { item } = useLocalSearchParams();
  const parsedItem = JSON.parse(item);

  // matching location of item to a store that has an account
  const [stores, setStores] = useState([]);
  const [isStoreMatch, setIsStoreMatch] = useState(false);

  useEffect(() => {
  if (!parsedItem?.store_id) return; // wait until item is loaded

  async function loadStores() {
    const { data, error } = await supabase
      .from("profiles")
      .select("store_id, role")
      .eq("role", "store");

    if (!error && data) {
      const match = data.some(shop => shop.store_id === parsedItem.store_id);
      setIsStoreMatch(match);
    }
  }

  loadStores();
}, [parsedItem]);

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: parsedItem.image_url }}
        style={styles.image}
        resizeMode="cover"
      />

      <Text style={styles.title}>{parsedItem.title}</Text>

      <Text style={styles.price}>£{parsedItem.price}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Size</Text>
        <Text style={styles.value}>{parsedItem.size}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{parsedItem.location}</Text>
      </View>

      {parsedItem.tags?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Tags</Text>
          <Text style={styles.value}>{parsedItem.tags.join(", ")}</Text>
        </View>
      )}

      {isStoreMatch && (
        <Pressable style={styles.reserveButton}>
          <Text style={styles.reserveButtonText}>Reserve</Text>
        </Pressable>
      )}

      <View style={{ height: 40 }} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
    backgroundColor: "#fff",
  },

  image: {
    width: "100%",
    height: 350,
    borderRadius: 12,
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },

  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#CE6674",
    marginBottom: 20,
  },

  section: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#777",
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    color: "#111",
  },

  reserveButton: {
  backgroundColor: "#CE6674",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 20,
},

reserveButtonText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
},
});
