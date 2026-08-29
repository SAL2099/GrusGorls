//Imports
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, TextInput, Alert, Image, FlatList, Dimensions, Modal, ScrollView } from "react-native";
import Screen from "../../components/Screen";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { validatePassword, getPasswordRequirements } from "../../lib/validation";
import { Ionicons } from "@expo/vector-icons"; //Icon
import { Linking } from 'react-native';
import StyledAlert from "../../components/StyledAlert";


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
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);


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

  // State for styled alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertContent, setAlertContent] = useState({ title: "", message: "" });

  // State for viewing a shop gallery item's details before deciding to edit
  const [viewingItem, setViewingItem] = useState<any>(null);

  // State for editing a shop gallery item (Store editing their own listing's price/size/tags)
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]); // same tag options as Upload screen
  const [savingItem, setSavingItem] = useState(false);

  // Same tag categories/options offered on the Upload screen, kept in sync here
  // so a store can only ever set tags from this fixed list, same 5-tag cap.
  const tagCategories = {
    Colours: ["Black", "White", "Red", "Blue", "Green", "Pink", "Brown", "Grey", "Yellow", "Multicoloured"],
    Styles: ["Vintage", "Y2K", "Casual", "Formal", "Sporty", "Oversized"],
    Types: ["Top", "Jumper", "Cardigan", "Dress", "One Piece", "Jeans", "Skirt", "Jacket", "Shoes", "Accessories", "Household"],
    Condition: ["New", "Like New", "Good", "Worn"],
  };

  // Toggles a tag on/off in the edit modal, same 5-tag limit as Upload
  function toggleEditTag(tag: string) {
    setEditTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= 5) {
        triggerAlert("Tag limit", "You can select up to 5 tags.");
        return prev;
      }
      return [...prev, tag];
    });
  }

  const triggerAlert = (title: string, message: string) => {
    setAlertContent({ title, message });
    setAlertVisible(true);
  };

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
      triggerAlert("Error", error.message);
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
      triggerAlert("Photo error", photoError.message);
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

    // Fetch announcements for this store
    if (data.role === "store") {
      const { data: announcementData, error: announcementError } =
        await supabase
          .from("announcements")
          .select("*")
          .eq("store_id", data.id)
          .order("created_at", { ascending: false });

      if (announcementError) {
        console.error("Announcement error:", announcementError);
        setAnnouncements([]);
      } else {
        setAnnouncements(announcementData ?? []);
      }
    } else {
      setAnnouncements([]);
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
      triggerAlert("Error missing:", "Display name is required.");
      return;
    }

    const updates: any = { display_name: displayName.trim() };

    if (profile.role === "store") {
      if (!storeName.trim() || !openingTimes.trim() || !address.trim()) {
        triggerAlert("Missing store info", "Store name, opening times, and address are required.");
        return;
      }
      updates.store_name = storeName.trim();
      updates.opening_times = openingTimes.trim();
      updates.address = address.trim();
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);

    if (error) {
      triggerAlert("Update failed", error.message);
      return;
    }

    setEditing(false);
    await loadProfile();
  }


  // Function to update password
  async function handleUpdatePassword() {
    const validation = validatePassword(newPassword);

    if (!validation.isValid) {
      triggerAlert("Invalid Password", validation.error);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      triggerAlert("Error", error.message);
    } else {
      triggerAlert("Success", "Password updated successfully!");
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
              triggerAlert("Error", error.message);
            } else {
              await loadProfile();
            }
          },
        },
      ]
    );
  }

  // Opens the read-only view modal for a shop gallery item
  function openViewItem(item: any) {
    setViewingItem(item);
  }

  // Closes the view modal
  function closeViewItem() {
    setViewingItem(null);
  }

  // Switches from viewing an item to editing it (closes the view modal, opens the edit modal)
  function startEditingFromView() {
    if (!viewingItem) return;
    const item = viewingItem;
    closeViewItem();
    openEditItem(item);
  }

  // Opens the edit modal and preloads the form fields with the item's current values
  function openEditItem(item: any) {
    setEditingItem(item);
    setEditTitle(item.title ?? "");
    setEditPrice(item.price != null ? item.price.toString() : "");
    setEditSize(item.size != null ? item.size.toString() : "");
    // tags is stored as an array (same as Upload screen's selectedTags) — normalise just in case
    setEditTags(Array.isArray(item.tags) ? item.tags : item.tags ? [item.tags] : []);
  }

  // Closes the edit modal without saving
  function closeEditItem() {
    setEditingItem(null);
    setEditTitle("");
    setEditPrice("");
    setEditSize("");
    setEditTags([]);
  }

  // Saves the edited shop item (price, size, title, tags) back to the photos table.
  // Relies on a Supabase RLS policy that allows a store to update photos where
  // photos.store_id matches their own profiles.store_id.
  async function saveShopItem() {
    if (!editingItem?.id) return;

    if (!editTitle.trim()) {
      triggerAlert("Missing title", "Please enter a title.");
      return;
    }

    if (editTags.length < 1) {
      triggerAlert("Missing tags", "Please select at least 1 tag.");
      return;
    }

    const parsedPrice = editPrice.trim() ? parseFloat(editPrice) : null;
    if (editPrice.trim() && Number.isNaN(parsedPrice)) {
      triggerAlert("Invalid price", "Please enter a valid number for price.");
      return;
    }

    try {
      setSavingItem(true);

      const { error } = await supabase
        .from("photos")
        .update({
          title: editTitle.trim(),
          price: parsedPrice,
          size: editSize.trim(),
          tags: editTags,
        })
        .eq("id", editingItem.id);

      if (error) {
        triggerAlert("Update failed", error.message);
        return;
      }

      closeEditItem();
      await loadProfile();
      triggerAlert("Saved", "Item updated successfully.");
    } finally {
      setSavingItem(false);
    }
  }

  async function postAnnouncement() {
    if (!profile?.id || profile.role !== "store") {
      return;
    }

    if (!announcementTitle.trim()) {
      triggerAlert("Missing title", "Please enter an announcement title.");
      return;
    }

    if (!announcementMessage.trim()) {
      triggerAlert("Missing message", "Please enter an announcement message.");
      return;
    }

    try {
      setPostingAnnouncement(true);

      const { error } = await supabase
        .from("announcements")
        .insert({
          store_id: profile.id,
          title: announcementTitle.trim(),
          message: announcementMessage.trim(),
        });

      if (error) {
        console.error("Announcement insert error:", error);
        triggerAlert("Error", error.message);
        return;
      }

      setAnnouncementTitle("");
      setAnnouncementMessage("");

      await loadProfile();

      triggerAlert("Posted", "Your announcement has been posted.");
    } finally {
      setPostingAnnouncement(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    Alert.alert(
      "Delete Announcement",
      "Are you sure you want to delete this announcement?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("announcements")
              .delete()
              .eq("id", id)
              .eq("store_id", profile.id);

            if (error) {
              triggerAlert("Error", error.message);
              return;
            }

            await loadProfile();
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
                    <Text style={styles.name}>{profile.store_name ?? "—"}</Text>
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
                          triggerAlert("Paid!", "Your monthly bill has been cleared.");
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

          {/* STORE ANNOUNCEMENTS */}
          {isStore && !editing && (
            <View style={styles.card}>
              <View style={styles.announcementHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Announcements
                  </Text>

                  <Text style={styles.sub}>
                    Updates for your customers
                  </Text>
                </View>

                <View style={styles.announcementIcon}>
                  <Ionicons
                    name="megaphone-outline"
                    size={20}
                    color="#fff"
                  />
                </View>
              </View>

              {/* Create announcement */}
              <View style={styles.announcementForm}>
                <TextInput
                  value={announcementTitle}
                  onChangeText={setAnnouncementTitle}
                  placeholder="Announcement title"
                  placeholderTextColor="#A7A7A7"
                  style={[styles.input, { marginBottom: 10 }]}
                />

                <TextInput
                  value={announcementMessage}
                  onChangeText={setAnnouncementMessage}
                  placeholder="Write your announcement..."
                  placeholderTextColor="#A7A7A7"
                  style={[
                    styles.input,
                    {
                      height: 90,
                      textAlignVertical: "top",
                    },
                  ]}
                  multiline
                />

                <Pressable
                  style={styles.button}
                  onPress={postAnnouncement}
                  disabled={postingAnnouncement}
                >
                  {postingAnnouncement ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Post Announcement
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Existing announcements */}
              {announcements.length === 0 ? (
                <Text style={styles.sub}>
                  You haven't posted any announcements yet.
                </Text>
              ) : (
                announcements.map((announcement) => (
                  <View
                    key={announcement.id}
                    style={styles.announcementCard}
                  >
                    <View style={styles.announcementTopRow}>
                      <Text style={styles.announcementTitle}>
                        {announcement.title}
                      </Text>

                      <Pressable
                        onPress={() =>
                          deleteAnnouncement(announcement.id)
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#f30678"
                        />
                      </Pressable>
                    </View>

                    <Text style={styles.announcementMessage}>
                      {announcement.message}
                    </Text>

                    <Text style={styles.announcementDate}>
                      {new Date(
                        announcement.created_at
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}


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
                      // Tap opens a read-only details view; Edit lives inside that view
                      onPress={() => openViewItem(item)}
                      onLongPress={() => deleteShopItem(item.id)}
                    >
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.uploadImage}
                      />
                      {/* Small pencil icon signals the item is tappable to view/edit */}
                      <View style={styles.editIconBadge}>
                        <Ionicons name="pencil" size={12} color="#fff" />
                      </View>
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

                        {/* If it's ready for pickup, show the TIMER (Green). Otherwise the store hasn't confirmed yet — don't reveal the number */}
                        {item.ready_for_pickup_at ? (
                          <View style={[styles.reservedBadge, { backgroundColor: '#4CAF50' }]}>
                            <Text style={styles.reservedBadgeText}>{timeLeft}</Text>
                          </View>
                        ) : (
                          <View style={styles.reservedBadge}>
                            <Text style={styles.reservedBadgeText}>Pending</Text>
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

      {/* View Shop Item Modal — read-only details, with an Edit button to fix anything wrong */}
      <Modal visible={!!viewingItem} transparent animationType="fade" onRequestClose={closeViewItem}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.sectionTitle}>Item details</Text>

              {viewingItem && (
                <>
                  <Image
                    source={{ uri: viewingItem.image_url }}
                    style={styles.viewItemImage}
                  />

                  <Text style={styles.label}>Title</Text>
                  <Text style={styles.viewValue}>{viewingItem.title || "—"}</Text>

                  <Text style={styles.label}>Price</Text>
                  <Text style={styles.viewValue}>
                    {viewingItem.price != null ? `£${Number(viewingItem.price).toFixed(2)}` : "—"}
                  </Text>

                  <Text style={styles.label}>Size</Text>
                  <Text style={styles.viewValue}>{viewingItem.size || "—"}</Text>

                  <Text style={styles.label}>Tags</Text>
                  <View style={styles.tagsContainer}>
                    {(Array.isArray(viewingItem.tags) ? viewingItem.tags : viewingItem.tags ? [viewingItem.tags] : []).length === 0 ? (
                      <Text style={styles.viewValue}>—</Text>
                    ) : (
                      (Array.isArray(viewingItem.tags) ? viewingItem.tags : [viewingItem.tags]).map((tag: string) => (
                        <View key={tag} style={[styles.tagChip, styles.tagChipSelected]}>
                          <Text style={[styles.tagChipText, styles.tagChipTextSelected]}>{tag}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}

              <Pressable style={styles.button} onPress={startEditingFromView}>
                <Text style={styles.buttonText}>Details wrong? Edit</Text>
              </Pressable>

              <Pressable style={[styles.button, styles.secondaryBtn]} onPress={closeViewItem}>
                <Text style={styles.buttonText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Shop Item Modal — lets a store update price/size/title/tags for a gallery item */}
      <Modal visible={!!editingItem} transparent animationType="fade" onRequestClose={closeEditItem}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.sectionTitle}>Edit item</Text>

              <Text style={styles.label}>Title</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                style={styles.input}
                placeholder="Title"
                placeholderTextColor="#A7A7A7"
              />

              <Text style={styles.label}>Price</Text>
              <TextInput
                value={editPrice}
                onChangeText={setEditPrice}
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#A7A7A7"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Size</Text>
              <TextInput
                value={editSize}
                onChangeText={setEditSize}
                style={styles.input}
                placeholder="Size"
                placeholderTextColor="#A7A7A7"
              />

              <Text style={styles.label}>Tags ({editTags.length}/5 selected)</Text>
              <View style={styles.tagsPanel}>
                {Object.entries(tagCategories).map(([category, tags]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <View style={styles.tagsContainer}>
                      {tags.map((tag) => {
                        const isSelected = editTags.includes(tag);
                        return (
                          <Pressable
                            key={tag}
                            style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                            onPress={() => toggleEditTag(tag)}
                          >
                            <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                              {tag}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>

              <Pressable style={styles.button} onPress={saveShopItem} disabled={savingItem}>
                {savingItem ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </Pressable>

              <Pressable style={[styles.button, styles.secondaryBtn]} onPress={closeEditItem}>
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* The Styled Alert */}
      <StyledAlert
        visible={alertVisible}
        title={alertContent.title}
        message={alertContent.message}
        onClose={() => setAlertVisible(false)}
      />
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
    outlineColor: "rgba(197, 103, 103, 0.4)",
    outlineWidth: 1,
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

  //Edit icon badge (small pencil in the corner of Store Gallery items)
  editIconBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(206, 102, 116, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  announcementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  announcementIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#CE6674",
    justifyContent: "center",
    alignItems: "center",
  },

  announcementForm: {
    marginTop: 8,
    marginBottom: 14,
  },

  announcementCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },

  announcementTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  announcementTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginRight: 10,
  },

  announcementMessage: {
    color: "#fff",
    opacity: 0.85,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 18,
  },

  announcementDate: {
    color: "#fff",
    opacity: 0.45,
    fontSize: 11,
    marginTop: 8,
  },

  // Tag chip styles (matches Upload screen's tag picker)
  tagsPanel: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  categorySection: {
    marginBottom: 14,
  },
  categoryTitle: {
    color: "#FFF",
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 15,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tagChip: {
    backgroundColor: "#121C0C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagChipSelected: {
    backgroundColor: "#CE6674",
    borderColor: "#CE6674",
  },
  tagChipText: {
    color: "#FFF",
    fontSize: 14,
  },
  tagChipTextSelected: {
    fontWeight: "700",
  },

  // Edit item modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#121C0C",
    borderRadius: 16,
    padding: 16,
    outlineColor: "rgba(197, 103, 103, 0.4)",
    outlineWidth: 1,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  viewItemImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  viewValue: {
    color: "#fff",
    fontSize: 15,
    marginBottom: 4,
  },

});