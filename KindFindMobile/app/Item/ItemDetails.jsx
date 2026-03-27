import { View, Text, Image, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import Screen from "../../components/Screen";

export default function ItemDetails() {
  const { item, id } = useLocalSearchParams();
  const router = useRouter();
  const segments = useSegments();

  // Detect if this screen is being viewed inside the (store) route group
  const isStoreView = segments.includes("(store)");

  const [parsedItem, setParsedItem] = useState(null);
  const [stores, setStores] = useState([]);
  const [isStoreMatch, setIsStoreMatch] = useState(false);
  const [user, setUser] = useState(null);

  // Load item depending on how the screen was opened
  useEffect(() => {
    async function load() {
      // Case 1: user passed full JSON item
      if (item) {
        try {
          const parsed = JSON.parse(item);
          setParsedItem(parsed);
          return;
        } catch (e) {
          console.error("Failed to parse item JSON:", e);
        }
      }

      // Case 2: store passed only ID
      if (id) {
        const { data, error } = await supabase
          .from("photos")
          .select("*")
          .eq("id", Number(id))
          .single();

        if (!error && data) {
          setParsedItem(data);
        }
      }
    }

    load();
  }, [item, id]);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      }
    }
    loadUser();
  }, []);

  // Match store_id to store profiles
  useEffect(() => {
    if (!parsedItem) return;
    if (!parsedItem.store_id) return;

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

  // Reserve handler (user only)
  const handleReserve = async () => {
    if (!user) return;

    const reservationNumber = Math.floor(100000 + Math.random() * 900000);

    if (!parsedItem) return;

    const { error } = await supabase
      .from("photos")
      .update({
        reserved: true,
        reserved_by: user.id,
        reserved_at: new Date().toISOString(),
        reservation_number: reservationNumber
      })
      .eq("id", Number(parsedItem.id));

    if (error) {
      console.error("Error reserving item: ", error);
      return;
    }

    Alert.alert(
      "Reserved!",
      `Your reservation number is ${reservationNumber}.`,
      [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
    );
  };

  // Mark as collected (store only)
  const handleCollected = async () => {
    if (!parsedItem) return;

    const { error } = await supabase
      .from("photos")
      .update({
        reserved: false,
        reserved_at: null,
        reservation_number: null,
        collected_at: new Date().toISOString()
      })
      .eq("id", Number(parsedItem.id));

    if (error) {
      console.error("Error marking collected:", error);
      return;
    }

    Alert.alert("Collected", "Item marked as collected.", [
      { text: "OK", onPress: () => router.replace("/(store)") }
    ]);
  };

  // Loading state
  if (!parsedItem) {
    return (
      <Screen>
        <Text style={{ color: "white", padding: 20 }}>Loading item…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Image
            source={require('../../assets/images/Back Arrow.png')}
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

          {/* USER VIEW — Reserve button */}
          {!isStoreView && isStoreMatch && !parsedItem.reserved && (
            <Pressable style={styles.reserveButton} onPress={handleReserve}>
              <Text style={styles.reserveButtonText}>Reserve</Text>
            </Pressable>
          )}

          {/* STORE VIEW — Reservation number + Mark as collected */}
          {isStoreView && parsedItem.reserved && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.label}>Reservation Number</Text>
              <Text style={[styles.value, { fontSize: 20, fontWeight: "700" }]}>
                {parsedItem.reservation_number}
              </Text>

              <Pressable style={styles.reserveButton} onPress={handleCollected}>
                <Text style={styles.reserveButtonText}>Mark as Collected</Text>
              </Pressable>
            </View>
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

  card: {
    backgroundColor: "#eef2e4",
    borderRadius: 14,
    padding: 20,
    paddingTop: 17,
    marginTop: 10,
    marginBottom: 16,
    elevation: 2,
  },

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
