// get info for items
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

// get locations of shops from supabase
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import Screen from "../components/Screen";

export default function ItemDetails() {
  const { item } = useLocalSearchParams();
  const parsedItem = JSON.parse(item);
  const router = useRouter();

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
    <Screen>
      <ScrollView style={styles.container}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Image
            source={require('../assets/images/Back Arrow.png')}
            style={styles.backBtnImage}
          />
        </Pressable>
        <View style={styles.card}>
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

              <View style={styles.tagRow}>
                {parsedItem.tags.map((tag, index) => (
                  <View key={index} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{tag}</Text>
                  </View>
                ))}
              </View>

            </View>
          )}

          {isStoreMatch && (
            <Pressable style={styles.reserveButton}>
              <Text style={styles.reserveButtonText}>Reserve</Text>
            </Pressable>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
    backgroundColor: "#192710",
  },

  //Item details
  image: {
    width: "100%",
    height: 350,
    borderRadius: 12,
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#000000",
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
    color: "#000000",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  value: {
    fontSize: 16,
    color: "#000000",
  },

  //reserve button
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

  //card style
  card: {
    backgroundColor: "#eef2e4",
    borderRadius: 14,
    padding: 20,
    paddingTop: 17,
    marginTop: 10,
    marginBottom: 16,
    elevation: 2,
  },

  //back button
  backBtn: {
    backgroundColor: "#CE6674",
    padding: 15,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    alignItems: "center",
    width: 50,
  },

  backBtnImage: {
    width: 20,
    height: 20,
  },

  buttonText: { color: "#fff", fontWeight: "900" },

  //tags 
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },

  tagChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: "#CE6674",
  },

  tagChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#CE6674",
  },

});
