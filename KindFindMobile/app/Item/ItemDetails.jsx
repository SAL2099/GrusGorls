// Imports 
import { View, Text, Image, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import Screen from "../../components/Screen";
import * as Notifications from 'expo-notifications';
import StyledAlert from "../../components/StyledAlert";

// ItemDetails screen shows detailed information about a specific item and allows users to reserve it or stores to mark it as collected
export default function ItemDetails() {
  const { item, id } = useLocalSearchParams();
  const router = useRouter();
  const segments = useSegments();

  // Detect if this screen is being viewed inside the (store) route group
  const isStoreView = segments.includes("(store)");

  const [parsedItem, setParsedItem] = useState(null);
  const [isStoreMatch, setIsStoreMatch] = useState(false);
  const [user, setUser] = useState(null);

  //Alert style
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertContent, setAlertContent] = useState({ 
    title: "", 
    message: "", 
    type: "" 
  });

  const triggerAlert = (title, message, type = "") => {
    setAlertContent({ title, message, type });
    setAlertVisible(true);
  };

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
    console.log("Notification scheduled at:", new Date().toLocaleTimeString());
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

    triggerAlert(
      "Reserved!",
      "Your item has been reserved. You'll see your reservation number here once the store confirms it's ready for pickup.",
      "GO_TABS"
    );
  };

  // Mark as collected (store only)
  const handleCollected = async () => {
    if (!parsedItem) return;

    const fee = parseFloat((parsedItem.price * 0.10).toFixed(2));
    const userIdToCharge = parsedItem.reserved_by;

    const { error } = await supabase
      .from("photos")
      .update({
        reserved: false,
        reserved_at: null,
        reservation_number: null,
        collected_at: new Date().toISOString(),
        cancelled_by_store: false,
      })
      .eq("id", Number(parsedItem.id));

    if (error) {
      console.error("Error marking collected:", error);
      return;
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.itemId === Number(parsedItem.id)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    const { error: rpcError } = await supabase.rpc('increment_monthly_total', {
      user_id: userIdToCharge,
      amount: fee
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      triggerAlert("Error", "Could not update user bill.");
    } else {
      triggerAlert("Collected", "Item marked as collected and user billed.", "GO_STORE");
    }
  };

  // Mark as ready for pickup (store only)
  const handleReadyForPickup = async () => {
    if (!parsedItem) return;

    const { error } = await supabase
      .from("photos")
      .update({
        ready_for_pickup_at: new Date().toISOString(),
      })
      .eq("id", Number(parsedItem.id));

    if (error) {
      triggerAlert("Error", "Could not mark as ready.");
      return;
    }

    triggerAlert("Success", "User has been notified to pick up the item!", "GO_BACK");
  };

  // Cancel reservation (store only)
  const handleCancelReservation = async () => {
    Alert.alert( 
      "Cancel Reservation",
      "Are you sure? The user will be notified and the item will return to the feed.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            if (!parsedItem) return;

            //Set cancelled flag first while reserved_by still matches the realtime filter
            const { error: flagError } = await supabase
              .from("photos")
              .update({ cancelled_by_store: true })
              .eq("id", Number(parsedItem.id));

            if (flagError) {
              triggerAlert("Error", "Could not cancel reservation.");
              return;
            }

            // Clear the reservation fields
            const { error: clearError } = await supabase
              .from("photos")
              .update({
                reserved: false,
                reserved_by: null,
                reserved_at: null,
                reservation_number: null,
                ready_for_pickup_at: null,
                cancelled_by_store: false, 
              })
              .eq("id", Number(parsedItem.id));

            if (clearError) {
              triggerAlert("Error", "Could not clear reservation.");
              return;
            }
            triggerAlert("Cancelled", "Reservation has been cancelled.", "GO_STORE");
          },
        },
      ]
    );
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
        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Image
            source={require('../../assets/images/Back Arrow.png')}
            style={styles.backBtnImage}
          />
        </Pressable>

        {/* Item details card */}
        <View style={styles.card}>
          <Image
            source={{ uri: parsedItem.image_url }}
            style={styles.image}
            resizeMode="cover"
          />

          <Text style={styles.title}>{parsedItem.title}</Text>
          <Text style={styles.price}>£{(parsedItem.price).toFixed(2)}</Text>

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

          {/* USER VIEW - Warning */}
          {!isStoreView && !isStoreMatch && (
            <View style={styles.reserveButton}>
              <Text style={styles.warningLabel}>Just so you know</Text>
              <Text style={styles.warningText}>
                KindFind cannot confirm that this item is still available at the specified location.
              </Text>
            </View>
          )}

          {/* USER VIEW — Reserve button */}
          {!isStoreView && isStoreMatch && !parsedItem.reserved && (
            <Pressable style={styles.reserveButton} onPress={handleReserve}>
              <Text style={styles.reserveButtonText}>Reserve</Text>
              <Text style={{ color: '#fff', fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                Cost to reserve: £{(parsedItem.price * 0.10).toFixed(2)}
              </Text>
            </Pressable>
          )}


          {/* STORE VIEW — Reservation number + Mark as collected */}
          {isStoreView && parsedItem.reserved && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.label}>Reservation Number</Text>
              <Text style={[styles.value, { fontSize: 20, fontWeight: "700" }]}>
                {parsedItem.reservation_number}
              </Text>

              {isStoreView && parsedItem.reserved && !parsedItem.ready_for_pickup_at && (
                <Pressable
                  style={[styles.reserveButton, { backgroundColor: '#4CAF50' }]}
                  onPress={handleReadyForPickup}
                >
                  <Text style={styles.reserveButtonText}>Ready for Pickup</Text>
                </Pressable>
              )}

              <Pressable style={styles.reserveButton} onPress={handleCollected}>
                <Text style={styles.reserveButtonText}>Mark as Collected</Text>
              </Pressable>

              <Pressable
                style={[styles.reserveButton, { backgroundColor: "#f30678", marginTop: 10 }]}
                onPress={handleCancelReservation}
              >
                <Text style={styles.reserveButtonText}>Cancel Reservation</Text>
              </Pressable>
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* The Styled Alert */}
      <StyledAlert
        visible={alertVisible}
        title={alertContent.title}
        message={alertContent.message}
        onClose={() => {
          setAlertVisible(false);
          if (alertContent.type === "GO_TABS") router.replace("/(tabs)");
          if (alertContent.type === "GO_STORE") router.replace("/(store)");
          if (alertContent.type === "GO_BACK") router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // General container styling for the screen
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
    backgroundColor: "#192710",
    outlineColor: "rgba(197, 103, 103, 0.4)",
    outlineWidth: 1,
  },

  image: {
    width: "100%",
    height: 350,
    borderRadius: 12,
    marginBottom: 20,
  },

  // Styles for the item detials
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

  //Reserve styles
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

  //Card styling for the item details
  card: {
    backgroundColor: "#eef2e4",
    borderRadius: 14,
    padding: 20,
    paddingTop: 17,
    marginTop: 10,
    marginBottom: 16,
    elevation: 2,
    outlineColor: "rgba(197, 103, 103, 0.4)",
    outlineWidth: 1,
  },

  //Back button styling
  backBtn: {
    backgroundColor: "#CE6674",
    padding: 15,
    marginLeft: 0,
    marginTop: 20,
    borderRadius: 12,
    alignItems: "center",
    width: 50,
  },

  backBtnImage: {
    width: 20,
    height: 20,
  },

  //tag styling for the item details
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

  warningLabel: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  warningText: {
    color: "#FFF",
    fontSize: 13,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});