import React, { useState, useEffect, useRef } from "react"; // React Native component for uploading images and metadata to Supabase
import { View, Text, Button, Image, TextInput, StyleSheet, ActivityIndicator, Alert, Pressable, Modal, Animated } from "react-native"; // UI components from React Native
import * as ImagePicker from "expo-image-picker"; // Expo module for picking images from the device's library
import * as Location from "expo-location"; // Needed to get user GPS
import { Dropdown } from 'react-native-element-dropdown'; // Dropdown component for selecting nearby shops
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; // Component to ensure the keyboard does not cover input fields on mobile devices

import MapView, { Marker } from "react-native-maps"; //MapView (smaller map component)
import { TouchableOpacity } from "react-native"; // TouchableOpacity component for making elements tappable on mobile devices

import { uploadImage } from "../../lib/uploadImage";
import { supabase } from "../../lib/supabase";
import Screen from "../../components/Screen";
import { fetchOsmShops } from "../../lib/osmService";

type UserLocation = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Shop = {
  id: string;
  name: string;
  displayName: string;
  address: string;
  lat: number;
  lng: number;
};



export default function UploadScreen() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  //tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);

  const [size, setSize] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");

  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Polaroid State & Animation
  const [isPrinting, setIsPrinting] = useState(false);
  const slideAnim = useRef(new Animated.Value(-200)).current;


  //Current tags
  const tagCategories = {
    Colours: ["Black", "White", "Red", "Blue", "Green", "Pink", "Brown", "Grey", "Yellow", "Multicoloured"],
    Styles: ["Vintage", "Y2K", "Casual", "Formal", "Sporty", "Oversized"],
    Types: ["Top", "Jumper", "Cardigan", "Dress","One Piece", "Jeans", "Skirt","Jacket", "Shoes", "Accessories", "Household"],
    Condition: ["New", "Like New", "Good", "Worn"],
  };

  useEffect(() => {
    if (isPrinting) {
      slideAnim.setValue(-200);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 3000,
        useNativeDriver: true,
      }).start();
    }
  }, [isPrinting]);

  useEffect(() => {
    (async () => {
      //Get the current user profile from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserProfile(profile);
      }

      //Load location and shops
      try {
        setLoadingShops(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;

          setUserLocation({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });

          const results = await fetchOsmShops(lat, lng, 5000);
          setShops(results);
        }
      } catch (error) {
        console.log("Failed to fetch nearby shops:", error);
      } finally {
        setLoadingShops(false);
      }
    })();
  }, []);

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission to access photos is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const url = await uploadImage(uri);
      setImageUrl(url);
    }
  };

  const saveMetadata = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    //Forces users to fill all feilds (backup for button Fail)
    if (
      !imageUrl ||
      !title.trim() ||
      !size.trim() ||
      !price.trim() ||
      selectedTags.length < 1
    ) {
      alert("Please fill in all fields and select at least 1 tag.");
      return;
    }

    //Force to store info if user is a store
    let locationToSave = location;
    if (userProfile?.role === "store") {
      locationToSave = `${userProfile.store_name} - ${userProfile.address}`;
    } else if (location !== "Other") {
      const selectedShop = shops.find(s => s.id === location);
      if (selectedShop) {
        locationToSave = `${selectedShop.name} - ${selectedShop.address}`;
      }
    }

    let storeIdToSave = null;

    if (userProfile?.role === "store") {
      storeIdToSave = userProfile.store_id;
    } else if (location !== "Other") {
      const selectedShop = shops.find(s => s.id === location);
      if (selectedShop) {
        locationToSave = `${selectedShop.name} - ${selectedShop.address}`;
        storeIdToSave = String(selectedShop.id);
      }
    }

    const { error } = await supabase.from("photos").insert([
      {
        user_id: userId,
        image_url: imageUrl,
        title,
        size,
        location: locationToSave,
        price,
        store_id: storeIdToSave,
        tags: selectedTags,
      },
    ]);

    if (error) {
      Alert.alert("Error", "Failed to save info");
    } else {
      setIsPrinting(true);

      setTimeout(() => {
        setIsPrinting(false);
        // Reset form
        setTitle("");
        setImageUrl(null);
        setSize("");
        setLocation("");
        setPrice("");
        setSelectedTags([]);
        Alert.alert("Success!", "Your photo has been developed.");
      }, 4500); // Slightly longer than the animation
    }
  };

  //Tag function 
  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }

      if (prev.length >= 5) {
        Alert.alert("Tag limit", "You can select up to 5 tags.");
        return prev;
      }

      return [...prev, tag];
    });
  }

  const isFormValid =
    imageUrl !== null &&
    title.trim().length > 0 &&
    size.trim().length > 0 &&
    price.trim().length > 0 &&
    selectedTags.length >= 1 &&
    selectedTags.length <= 5 &&
    (userProfile?.role === "store" || location.length > 0);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Upload an Image</Text>
        <Button title="Pick Image" onPress={pickAndUpload} />

        {imageUrl && (
          <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} enableOnAndroid={true}>
            <View style={{ alignItems: 'center' }}>
              <Image source={{ uri: imageUrl }} style={styles.image} />
            </View>

            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />

            <Pressable
              style={styles.addTagsButton}
              onPress={() => setShowTags((prev) => !prev)}
            >
              <Text style={styles.buttonText}>
                {showTags
                  ? `Hide tags (${selectedTags.length}/5 selected)`
                  : "Add tags (1 minimum)"
                }
              </Text>
            </Pressable>

            <Text style={styles.tagHelperText}>
              {selectedTags.length}/5 selected
            </Text>

            {showTags && (
              <View style={styles.tagsPanel}>
                {Object.entries(tagCategories).map(([category, tags]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{category}</Text>

                    <View style={styles.tagsContainer}>
                      {tags.map((tag) => {
                        const isSelected = selectedTags.includes(tag);

                        return (
                          <Pressable
                            key={tag}
                            style={[
                              styles.tagChip,
                              isSelected && styles.tagChipSelected
                            ]}
                            onPress={() => toggleTag(tag)}
                          >
                            <Text
                              style={[
                                styles.tagChipText,
                                isSelected && styles.tagChipTextSelected
                              ]}
                            >
                              {tag}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TextInput placeholder="Size" value={size} onChangeText={setSize} style={styles.input} />

            {/* Only show location selection for regular users */}
            {userProfile?.role !== "store" ? (
              <>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]} onPress={() => setViewMode('list')}>
                    <Text style={styles.toggleText}>List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]} onPress={() => setViewMode('map')}>
                    <Text style={styles.toggleText}>Map</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.selectionArea}>
                  {loadingShops ? <ActivityIndicator size="small" color="#FFF" /> : viewMode === 'list' ? (
                    <Dropdown
                      style={styles.dropdown}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      data={[...shops.map(shop => ({ label: shop.displayName, value: shop.id })), { label: "Other", value: "Other" }]}
                      value={location}
                      labelField="label"
                      valueField="value"
                      onChange={item => setLocation(item.value)}
                    />
                  ) : (
                    <View style={styles.miniMapWrapper}>
                      {userLocation && (
                        <MapView style={styles.miniMap} initialRegion={userLocation} showsUserLocation={true}>
                          {shops.map((shop) => (
                            <Marker key={shop.id} coordinate={{ latitude: shop.lat, longitude: shop.lng }} title={shop.name} pinColor={location === shop.id ? "green" : "red"} onPress={() => setLocation(shop.id)} />
                          ))}
                        </MapView>
                      )}
                      <Text style={styles.selectedMapText}>
                        {location
                          ? `Selected: ${shops.find((s) => s.id === location)?.displayName || location}`
                          : "Tap a pin to select"}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={[styles.input, { backgroundColor: '#f0f0f0' }]}>
                <Text>Posting as: {userProfile.store_name}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: "#FFF" }}>£</Text>
              <TextInput placeholder="Price" value={price} onChangeText={setPrice} style={styles.price} />
            </View>

            {/* Changed to a Touchable instead of button for style*/}
            <TouchableOpacity
              onPress={saveMetadata}
              disabled={!isFormValid}
              style={{ backgroundColor: isFormValid ? "#CE6674" : "#555", padding: 15, borderRadius: 8 }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>Save Info</Text>
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        )}
      </View>

      {/* PRINTING MODAL */}
      {isPrinting && (
        <Modal visible={isPrinting} transparent={true} animationType="fade">
          <View style={styles.printingOverlay}>
            <View style={styles.cameraContainer}>

              {/* The Camera Body */}
              <View style={styles.cameraTop} />

              {/* The Hidden Slot */}
              <View style={styles.printerMouth}>
                <Animated.View style={[
                  styles.printingPhoto,
                  { transform: [{ translateY: slideAnim }] }
                ]}>
                  <View style={styles.polaroidFrame}>
                    <Image
                      source={{ uri: imageUrl || '' }}
                      style={styles.polaroidImage}
                    />
                    <Text style={styles.polaroidText}>{title || "Untitled"}</Text>
                  </View>
                </Animated.View>
              </View>

              <Text style={styles.developingText}>Developing...</Text>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

// Styles for the upload screen components
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: "center" },
  title: { fontSize: 22, marginBottom: 20, color: "#FFF" },
  image: { width: 250, height: 250, marginVertical: 20 },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#FFF",
  },
  price: {
    width: "94%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    marginLeft: 10,
    backgroundColor: "#FFF",
  },

  dropdownWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  dropdown: {
    height: 50,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#000',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 8,
  },

  // Styles for the toggle buttons to switch between list and map view
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#333',
    padding: 4,
  },

  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },

  toggleBtnActive: {
    backgroundColor: '#CE6674',
  },

  toggleText: {
    color: '#FFF',
    fontWeight: '600',
  },

  selectionArea: {
    width: '100%',
    marginBottom: 15,
  },

  miniMapWrapper: {
    height: 250,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFF',
  },

  miniMap: {
    flex: 1,
  },

  selectedMapText: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#FFF',
    padding: 8,
    textAlign: 'center',
    fontSize: 14,
  },

  //Tags
  label: {
    color: "#FFF",
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "600",
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

  tagHelperText: {
    color: "#A7A7A7",
    marginBottom: 10,
  },

  addTagsButton: {
    backgroundColor: "#CE6674",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },

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

  buttonText: {
    color: "#FFF"
  },

  //Poloroid printing 
  printingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    alignItems: 'center',
    width: '100%',
  },
  cameraTop: {
    width: 240,
    height: 80,
    backgroundColor: '#333',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    zIndex: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#111',
  },
  printerMouth: {
    width: 240,
    height: 300,
    overflow: 'hidden',
    alignItems: 'center',
    zIndex: 10,
  },
  printingPhoto: {
    zIndex: 5,
    marginTop: -10,
  },
  polaroidFrame: {
    width: 190,
    backgroundColor: '#FFF',
    padding: 12,
    paddingBottom: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  polaroidImage: {
    width: 166,
    height: 166,
    backgroundColor: '#222', // Looks like a black film before it "develops"
  },
  polaroidText: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  developingText: {
    color: '#FFF',
    marginTop: 50,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});



