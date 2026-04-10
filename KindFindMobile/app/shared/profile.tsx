//Imports
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, TextInput, Alert, Image, FlatList, Dimensions } from "react-native";
import Screen from "../../components/Screen";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { validatePassword, getPasswordRequirements } from "../../lib/validation";
import { Ionicons } from "@expo/vector-icons"; //Icon
import { Linking } from 'react-native';


const screenWidth = Dimensions.get("window").width;
const horizontalPadding = 32; // container padding: 16 left + 16 right
const gap = 8;
const imageSize = (screenWidth - horizontalPadding - gap * 2 - 28) / 3;

// The ProfileScreen component displays the user's profile information and allows them to edit it or log out
export default function ProfileScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();

  // State variables to manage loading state, profile data, edit mode, and form inputs
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [uploads, setUploads] = useState<any[]>([]);
  const [shopUploads, setShopUploads] = useState<any[]>([]);

  // Form state for profile fields
  const [displayName, setDisplayName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [openingTimes, setOpeningTimes] = useState("");
  const [address, setAddress] = useState("");

  //Passwords
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  //reservation stuff
  const [reservations, setReservations] = useState<any[]>([]);
  const [pastReservations, setPastReservations] = useState<any[]>([]);

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
      .is("collected_at", null)
      .is("reserved", false)
      .order("created_at", { ascending: false });

    if (photoError) {
      Alert.alert("Photo error", photoError.message);
      setUploads([]);
    } else {
      setUploads(photoData ?? []);
    }

    // Fetch all photos associated with this shop's unique id (if it's a store profile)
    if (data.role === "store" && data.store_name && data.store_id) {
      const { data: shopData } = await supabase
        .from("photos")
        .select("*")
        .eq("store_id", data.store_id)
        .is("collected_at", null)
        .eq("reserved", false)
        .order("created_at", { ascending: false });

      console.log("store_id used:", data.store_id);
      console.log("shopData:", shopData);
      setShopUploads(shopData ?? []);
    } else {
      setShopUploads([]);
    }
    const { data: resData, error: resError } = await supabase
      .from("photos")
      .select("*")
      .eq("reserved_by", user.id)
      .eq("reserved", true) // Only show active reservations
      .order("reserved_at", { ascending: false });

    if (!resError) {
      setReservations(resData ?? []);
    }

    // Fetch Past Reservations (where collected_at is NOT null)
    const { data: pastData, error: pastError } = await supabase
      .from("photos")
      .select("*")
      .eq("reserved_by", user.id)
      .not("collected_at", "is", null) // This filters for collected items
      .order("collected_at", { ascending: false });

    if (!pastError) {
      setPastReservations(pastData ?? []);
    }

    setLoading(false);
  }


  // Function to save the updated profile information back to the database
  async function saveProfile() {
    if (!profile?.id) return;

    if (!displayName.trim()) {
      Alert.alert("Error missing:", "Display name is required.");
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


  // Function to update password
  async function handleUpdatePassword() {
    const validation = validatePassword(newPassword);

    if (!validation.isValid) {
      Alert.alert(
        "Invalid Password",
        validation.error
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Password updated successfully!");
      setNewPassword("");
      setChangingPassword(false);
    }
    setLoading(false);
  }


  // Function to log the user out by signing out of their Supabase session
  async function logout() {
    await supabase.auth.signOut();
  }

  //Function to handle delete shop side
  async function deleteShopItem(itemId: string) {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("photos")
              .delete()
              .eq("id", itemId);

            if (error) {
              Alert.alert("Error", error.message);
            } else {
              await loadProfile();
            }
          },
        },
      ]
    );
  }

  // Load the profile data when the component mounts
  useEffect(() => {
    if (isFocused) {
      loadProfile();
    }
  }, [isFocused]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000); //1 minute

    return () => clearInterval(timer);
  }, []);

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
          <Text style={styles.sub}>No profile found.</Text>
        </View>
      </Screen>
    );
  }

  const isStore = profile.role === "store";

  // Render the profile information, and if in edit mode, show input fields to update the profile
  return (
    <Screen>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid={true}
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            {!editing ? (
              <>
                {isStore ? (
                  <>
                    <Text style={styles.sub}>Account type: {isStore ? "Store" : "User"}</Text>
                    <Text style={styles.sub}>Store name: {profile.store_name ?? "—"}</Text>
                    <Text style={styles.sub}>Opening times: {profile.opening_times ?? "—"}</Text>
                    <Text style={styles.sub}>Address: {profile.address ?? "—"}</Text>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 }}>
                    {/* Left side — name and welcome */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sub}>Account type: {isStore ? "Store" : "User"}</Text>
                      <Text style={styles.name}>{profile.display_name}</Text>
                      <Text style={styles.sub}>Welcome back 💚</Text>
                    </View>

                    {/* Right side — bill */}
                    <View style={styles.billCard}>
                      <Text style={styles.billLabel}>Monthly Bill</Text>
                      <Text style={styles.billAmount}>£{(profile.monthly_total ?? 0).toFixed(2)}</Text>
                      <Pressable
                        style={[styles.button, { backgroundColor: '#4CAF50', marginTop: 6, width: '100%' }]}
                        onPress={async () => {
                          await Linking.openURL('https://www.paypal.com');
                          await supabase
                            .from("profiles")
                            .update({ monthly_total: 0 })
                            .eq("id", profile.id);
                          await loadProfile();
                          Alert.alert("Paid!", "Your monthly bill has been cleared.");
                        }}
                      >
                        <Text style={styles.buttonText}>Pay Bill</Text>
                      </Pressable>
                    </View>
                  </View>
                )}


                <Pressable style={styles.button} onPress={() => setEditing(true)}>
                  <Text style={styles.buttonText}>Edit profile</Text>
                </Pressable>

                {/* Password Change Section */}
                {!editing && (
                  <>
                    {!changingPassword ? (
                      <Pressable
                        style={[styles.button]}
                        onPress={() => setChangingPassword(true)}
                      >
                        <Text style={styles.buttonText}>Change Password</Text>
                      </Pressable>
                    ) : (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.passwordContainer}>
                          <TextInput
                            value={newPassword}
                            onChangeText={setNewPassword}
                            style={[styles.Passwordinput, { backgroundColor: 'transparent' }]}
                            placeholder="Enter new password"
                            placeholderTextColor="#A7A7A7"
                            secureTextEntry={!showPassword}
                          />
                          <Pressable
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                          >
                            <Ionicons
                              name={showPassword ? "eye-off-outline" : "eye-outline"}
                              size={20}
                              color="#A7A7A7"
                            />
                          </Pressable>
                        </View>
                        {/* Password checklist*/}
                        {newPassword.length > 0 && (
                          <View style={styles.requirementContainer}>
                            {getPasswordRequirements(newPassword).map((req, index) => (
                              <Text
                                key={index}
                                style={[
                                  styles.requirementText,
                                  { color: req.fulfilled ? "#4CAF50" : "#A7A7A7" }
                                ]}
                              >
                                {req.fulfilled ? "✓" : "○"} {req.label}
                              </Text>
                            ))}
                          </View>
                        )}

                        {/* Update and Cancel buttons for password change */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable
                            style={[styles.button, { flex: 1 }]}
                            onPress={handleUpdatePassword}
                          >
                            <Text style={styles.buttonText}>Update</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.button, styles.secondaryBtn, { flex: 1 }]}
                            onPress={() => {
                              setChangingPassword(false);
                              setNewPassword("");
                            }}
                          >
                            <Text style={styles.buttonText}>Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </>
                )}

                <Pressable style={[styles.button, styles.logoutBtn]} onPress={logout}>
                  <Text style={styles.buttonText}>Log out</Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Edit mode: show input fields to update profile information */}
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
                            tags: item.tags,
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

          {/* Show shop-wide uploads if the user is a store */}
          {isStore && !editing && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Store Gallery</Text>

              {shopUploads.length === 0 ? (
                <Text style={styles.sub}>No items uploaded to this location yet.</Text>
              ) : (
                <FlatList<any>
                  data={shopUploads}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.uploadRow}
                  contentContainerStyle={styles.uploadGrid}
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
                            tags: item.tags,
                            price: item.price,
                            size: item.size,
                            location: item.location
                          }
                        });
                      }}
                      onLongPress={() => deleteShopItem(item.id)}
                    >
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.uploadImage}
                      />
                      <View style={styles.deleteBadge}>
                        <Text style={styles.deleteBadgeText}>Hold to delete</Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}

          {/* Current Reservations Section */}
          {!isStore && !editing && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>My Reservations</Text>

              {reservations.length === 0 ? (
                <Text style={styles.sub}>You have no active reservations.</Text>
              ) : (
                <FlatList<any>
                  data={reservations}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.uploadRow}
                  contentContainerStyle={styles.uploadGrid}
                  renderItem={({ item }) => {
                    const timeLeft = getRemainingTime(item.ready_for_pickup_at);
                    return (
                      <Pressable
                        style={styles.imageWrapper}
                        onPress={() => {
                          router.push({
                            pathname: "/listing/[id]",
                            params: {
                              id: item.id,
                              item: JSON.stringify(item),
                            },
                          });
                        }}
                      >
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.uploadImage}
                        />

                        {/* If it's ready for pickup, show the TIMER (Green). Otherwise show the ID (Red) */}
                        {item.ready_for_pickup_at ? (
                          <View style={[styles.reservedBadge, { backgroundColor: '#4CAF50' }]}>
                            <Text style={styles.reservedBadgeText}>{timeLeft}</Text>
                          </View>
                        ) : (
                          <View style={styles.reservedBadge}>
                            <Text style={styles.reservedBadgeText}>#{item.reservation_number}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  }}
                />
              )}
            </View>
          )}
          {/* Past Reservations Section */}
          {!isStore && !editing && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Past Pickups</Text>

              {pastReservations.length === 0 ? (
                <Text style={styles.sub}>No past history yet</Text>
              ) : (
                <FlatList<any>
                  data={pastReservations}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.uploadRow}
                  contentContainerStyle={styles.uploadGrid}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.imageWrapper, { opacity: 0.9 }]}
                      onPress={() => {
                        router.push({
                          pathname: "/listing/[id]",
                          params: { id: item.id }
                        });
                      }}
                    >
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.uploadImage}
                      />
                      <View style={styles.collectedBadge}>
                        <Text style={styles.collectedBadgeText}>COLLECTED</Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

// Helper function to calculate remaining time for pickup based on the ready_for_pickup_at timestamp
const getRemainingTime = (readyAt: any) => {
  if (!readyAt) return null;

  const expiryDate = new Date(readyAt);
  expiryDate.setHours(expiryDate.getHours() + 48);

  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m left`;
};


const styles = StyleSheet.create({
  // Container style for the whole screen
  container: {
    padding: 16,
    gap: 10
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  // Card style for the profile information section
  card: {
    backgroundColor: "#121C0C",
    borderRadius: 16,
    padding: 14,
    paddingTop: 10,
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

  //Makes the page scrollable 
  scrollContainer: {
    paddingBottom: 20, // Adds space at the bottom so you can click the next field
  },

  //reserved codes
  reservedBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(206, 102, 116, 0.9)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  reservedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },

  //collected styles
  collectedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 2,
    borderRadius: 4,
  },

  //password styles 
  requirementContainer: {
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  requirementText: {
    fontSize: 12,
    marginBottom: 4,
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    marginBottom: 15,
  },

  Passwordinput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
  },

  eyeIcon: {
    paddingRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  //Total
  billCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minWidth: 120,
    paddingBottom: 10,
    marginBottom: 10,
  },
  billLabel: {
    color: "#fff",
    opacity: 0.7,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "800",
  },
  billAmount: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    marginVertical: 6,
  },

  //Delete button
  deleteBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(243, 6, 120, 0.85)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  deleteBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
});

