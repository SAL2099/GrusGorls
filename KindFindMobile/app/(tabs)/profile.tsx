import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, TextInput, Alert, Image, FlatList, Dimensions } from "react-native";
import Screen from "../../components/Screen"; //import custom Screen component for consistent styling and layout
import { supabase } from "../../lib/supabase"; //Import supabase client for authentication and database interactions
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";


const screenWidth = Dimensions.get("window").width;
const horizontalPadding = 32; // container padding: 16 left + 16 right
const gap = 8;
const imageSize = (screenWidth - horizontalPadding - gap * 2 - 28) / 3;

// The ProfileScreen component displays the user's profile information and allows them to edit it or log out
export default function ProfileScreen() {

  const router = useRouter();
  // State variables to manage loading state, profile data, edit mode, and form inputs
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [uploads, setUploads] = useState<any[]>([]);

  // Form state for profile fields
  const [displayName, setDisplayName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [openingTimes, setOpeningTimes] = useState("");
  const [address, setAddress] = useState("");

  // Function to load the user's profile data from the database
  async function loadProfile() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data);
    setDisplayName(data.display_name ?? "");
    setStoreName(data.store_name ?? "");
    setOpeningTimes(data.opening_times ?? "");
    setAddress(data.address ?? "");

    // Fetch this user's uploads
    const { data: photoData, error: photoError } = await supabase
      .from("photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (photoError) {
      Alert.alert("Photo error", photoError.message);
      setUploads([]);
    } else {
      setUploads(photoData ?? []);
    }
    setLoading(false);
  }

  // Function to save the updated profile information back to the database
  async function saveProfile() {
    if (!profile?.id) return;

    if (!displayName.trim()) {
      Alert.alert("Missing info", "Display name is required.");
      return;
    }

    const updates: any = { display_name: displayName.trim() };

    if (profile.role === "store") {
      if (!storeName.trim() || !openingTimes.trim() || !address.trim()) {
        Alert.alert("Missing store info", "Store name, opening times, and address are required.");
        return;
      }
      updates.store_name = storeName.trim();
      updates.opening_times = openingTimes.trim();
      updates.address = address.trim();
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);

    if (error) {
      Alert.alert("Update failed", error.message);
      return;
    }

    setEditing(false);
    await loadProfile();
  }

  // Function to log the user out by signing out of their Supabase session
  async function logout() {
    await supabase.auth.signOut();
  }

  // Load the profile data when the component mounts
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  // Show a loading indicator while the profile data is being fetched
  if (loading) {
    return (
      <Screen>
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      </Screen>
    );
  }

  // If no profile is found show a message
  if (!profile) {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.sub}>No profile found.</Text>
        </View>
      </Screen>
    );
  }

  const isStore = profile.role === "store";

  // Render the profile information, and if in edit mode, show input fields to update the profile
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.sub}>Account type: {isStore ? "Store" : "User"}</Text>

          {!editing ? (
            <>
              <Text style={styles.name}>{profile.display_name}</Text>

              {isStore ? (
                <>
                  <Text style={styles.sub}>Store name: {profile.store_name ?? "—"}</Text>
                  <Text style={styles.sub}>Opening times: {profile.opening_times ?? "—"}</Text>
                  <Text style={styles.sub}>Address: {profile.address ?? "—"}</Text>
                </>
              ) : (
                <Text style={styles.sub}>Welcome back 💚</Text>
              )}

              <Pressable style={styles.button} onPress={() => setEditing(true)}>
                <Text style={styles.buttonText}>Edit profile</Text>
              </Pressable>

              <Pressable style={[styles.button, styles.logoutBtn]} onPress={logout}>
                <Text style={styles.buttonText}>Log out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Edit</Text>

              <Text style={styles.label}>Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
                placeholder="Display name"
                placeholderTextColor="#A7A7A7"
              />

              {isStore ? (
                <>
                  <Text style={styles.label}>Store name</Text>
                  <TextInput
                    value={storeName}
                    onChangeText={setStoreName}
                    style={styles.input}
                    placeholder="Store name"
                    placeholderTextColor="#A7A7A7"
                  />

                  <Text style={styles.label}>Opening times</Text>
                  <TextInput
                    value={openingTimes}
                    onChangeText={setOpeningTimes}
                    style={[styles.input, { height: 80 }]}
                    placeholder="Mon–Sat 10–5"
                    placeholderTextColor="#A7A7A7"
                    multiline
                  />

                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    style={[styles.input, { height: 80 }]}
                    placeholder="Address"
                    placeholderTextColor="#A7A7A7"
                    multiline
                  />
                </>
              ) : null}

              <Pressable style={styles.button} onPress={saveProfile}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>

              <Pressable style={[styles.button, styles.secondaryBtn]} onPress={() => setEditing(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Show the user's uploads */}
        {!editing && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>My uploads</Text>

            {uploads.length === 0 ? (
              <Text style={styles.sub}>You haven’t uploaded anything yet.</Text>
            ) : (
              <FlatList<any>
                data={uploads}
                keyExtractor={(item) => item.id.toString()}
                numColumns={3}
                scrollEnabled={false}
                columnWrapperStyle={styles.uploadRow}
                contentContainerStyle={styles.uploadGrid}
                
                // When an upload is pressed, navigate to the listing details screen and pass the listing data as params
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.imageWrapper}
                    onPress={() => {
                      router.push({
                        pathname: "/listing/[id]",
                        params: {
                          id: item.id,
                          title: item.title,
                          image_url: item.image_url,
                          description: item.description,
                          price: item.price,
                          size: item.size,
                          location: item.location
                        }
                      });
                    }}
                  >
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.uploadImage}
                    />
                  </Pressable>
                )}
              />
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

// Define styles for the ProfileScreen component using StyleSheet
const styles = StyleSheet.create({
  // Container style for the whole screen
  container: { 
    flex: 1, 
    padding: 16, 
    gap: 16 
  },

  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12
  },

  // Card style for the profile information section
  card: {
    backgroundColor: "#121C0C",
    borderRadius: 16,
    padding: 14
  },

  name: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "900", 
    marginTop: 8 
  },

  sub: { 
    color: "#fff", 
    opacity: 0.85, 
    marginTop: 6 
  },

  // Styles for the edit mode
  sectionTitle: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "800", 
    marginTop: 10, 
    marginBottom: 10 
  },

  label: { 
    color: "#fff", 
    opacity: 0.8, 
    marginTop: 10, 
    marginBottom: 6 
  },

  // Styles for the input fields and buttons
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
  },

  // Primary button style, with variations for secondary and logout actions
  button: { 
    marginTop: 12, 
    backgroundColor: "#CE6674", 
    paddingVertical: 10, 
    borderRadius: 12, 
    alignItems: "center" 
  },

  secondaryBtn: { backgroundColor: "rgba(255,255,255,0.12)" },
  logoutBtn: { backgroundColor: "#f30678" },
  buttonText: { color: "#fff", fontWeight: "900" },

  // Styles for the uploads grid
  uploadGrid: {
    marginTop: 10,
  },

  uploadRow: {
    justifyContent: "flex-start",
    gap: 8,
    marginBottom: 8,
  },

  imageWrapper: {
    width: imageSize,
    height: imageSize,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  uploadImage: {
    width: "100%",
    height: "100%",
  },
});

