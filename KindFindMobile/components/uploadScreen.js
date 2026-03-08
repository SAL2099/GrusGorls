import React, { useState, useEffect } from "react"; // React Native component for uploading images and metadata to Supabase
import { View, Text, Button, Image, TextInput, StyleSheet, ActivityIndicator } from "react-native"; // UI components from React Native
import * as ImagePicker from "expo-image-picker"; // Expo module for picking images from the device's library
import * as Location from "expo-location"; // Needed to get user GPS
import { Dropdown } from 'react-native-element-dropdown'; // Dropdown component for selecting nearby shops
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; // Component to ensure the keyboard does not cover input fields on mobile devices

import MapView, { Marker } from "react-native-maps"; //MapView (smaller map component)
import { TouchableOpacity } from "react-native"; // TouchableOpacity component for making elements tappable on mobile devices

import { uploadImage } from "../lib/uploadImage"; // Custom function to handle image upload to Supabase Storage
import { supabase } from "../lib/supabase"; // Supabase client instance for database interactions
import Screen from "../components/Screen"; // Custom Screen component 

import { fetchOsmShops } from "../lib/osmService"; //Fetch the charity shops


export default function UploadScreen() { // Main component for the upload screen
  const [imageUrl, setImageUrl] = useState(null); // State to hold the URL of the uploaded image
  const [title, setTitle] = useState(""); // State to hold the title input by the user
  const [description, setDescription] = useState(""); // State to hold the description input by the user
  const [size, setSize] = useState(""); // State to hold the size input by the user
  const [location, setLocation] = useState(""); // State to hold the location input by the user
  const [price, setPrice] = useState("")  // State to hold the price input by the user

  const [shops, setShops] = useState([]);  // State to hold the list of nearby shops fetched from OpenStreetMap
  const [loadingShops, setLoadingShops] = useState(false); // State to indicate whether the app is currently loading nearby shops

  const [viewMode, setViewMode] = useState("list"); // "list" or "map"
  const [userLocation, setUserLocation] = useState(null); // To center the mini-map

  useEffect(() => {
    (async () => {
      try {
        setLoadingShops(true);
        //Asks for location permission, gets GPS coordinates, and fetches nearby shops from OpenStreetMap using the Overpass API
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLoadingShops(false);
          return;
        }

        // Get current location coordinates
        const loc = await Location.getCurrentPositionAsync({});
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        // Fetch nearby shops using the coordinates and a radius of 5000 meters (5 km)
        const results = await fetchOsmShops(lat, lng, 5000);
        setShops(results);
      } catch (error) {
        console.log("Failed to fetch nearby shops:", error);
      } finally {
        setLoadingShops(false);
      }

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const pickAndUpload = async () => { // Function to handle image picking and uploading
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); // Request permission to access the media library
    if (!permission.granted) { //Request permission to access the media library
      alert("Permission to access photos is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ // Open the image picker
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) { // If the user picked an image, upload it and get the URL
      const uri = result.assets[0].uri;
      const url = await uploadImage(uri);
      setImageUrl(url); 
      console.log("SET IMAGE URL:", url);
    }
  };

  const saveMetadata = async () => { // Function to save the image metadata to the Supabase database

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) { // If the user is not logged in, alert them and return early
      alert("Please log in first");
      return;
    }

    let locationToSave = location; // By default, save the location as is (this will be "Other" or a shop ID) makes it readable in the database, we want to convert shop IDs to their names before saving
      if (location !== "Other") {
        const selectedShop = shops.find(s => s.id === location);
        if (selectedShop) {
          locationToSave = `${selectedShop.name} - ${selectedShop.address}`; // Convert the selected shop ID to its name for easier readability in the database
        }
      }

    const { error } = await supabase.from("photos").insert([ // Insert a new record into the "photos" table with the image URL and metadata
      {
        user_id: userId,
        image_url: imageUrl,
        title,
        description,
        size,
        location: locationToSave, // Convert location ID to a readable string before saving
        price,
      },
    ]);

    if (error) { // If there's an error, log it and alert the user
      console.log("DB ERROR:", error);
      alert("Failed to save info");
    } else {
      alert("Saved!");
      setTitle("");
      setDescription("");
      setImageUrl(null);
      setSize("");
      setLocation("");
      setPrice("");
    }
  };

  return ( // Render the UI for the upload screen
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Upload an Image</Text>

        <Button title="Pick Image" onPress={pickAndUpload} />

        {/* Render the image and metadata inputs if an image URL is available */}
        {imageUrl && (
          <>
            <KeyboardAwareScrollView
              contentContainerStyle={{ flexGrow: 1, padding: 20 }}
              enableOnAndroid={true}
            >

              <View style={{ alignItems: 'center' }}>
                <Image source={{ uri: imageUrl }} style={styles.image} />
              </View>

              <TextInput
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
              />

              <TextInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                style={styles.input}
              />

              <TextInput
                placeholder="Size"
                value={size}
                onChangeText={setSize}
                style={styles.input}
              />

              {/* Toggle Buttons for Map/List View*/}
              <View style={styles.toggleContainer}>

                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Text style={styles.toggleText}>List</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('map')}
                >
                  <Text style={styles.toggleText}>Map</Text>
                </TouchableOpacity>
              </View>

              {/* Location Selection */}
              <View style={styles.selectionArea}>
                {loadingShops ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : viewMode === 'list' ? (
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    data={[
                      ...shops.map(shop => ({ label: shop.displayName, value: shop.id })),
                      { label: "Other", value: "Other" }
                    ]}
                    value={location}
                    labelField="label"
                    valueField="value"
                    onChange={item => setLocation(item.value)}
                  />
                ) : (
                  <View style={styles.miniMapWrapper}>
                    {/* Ensure userLocation is loaded before rendering MapView */}
                    {userLocation && (
                      <MapView
                        key={location}
                        style={styles.miniMap}
                        initialRegion={userLocation}
                        showsUserLocation={true}
                      >
                        {shops.map((shop) => (
                          <Marker
                            key={shop.id}
                            coordinate={{ latitude: shop.lat, longitude: shop.lng }}
                            title={shop.name}
                            pinColor={location === shop.id ? "green" : "red"} // Highlight selected shop in green
                            onPress={() => setLocation(shop.id)}
                          />
                        ))}
                      </MapView>
                    )}
                    <Text style={styles.selectedMapText}>
                      {location 
                        ? `Selected: ${shops.find(s => s.id === location)?.displayName || location}` 
                        : "Tap a pin to select"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Price Input */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: "#FFF" }}>£</Text>
                <TextInput
                  placeholder="Price"
                  value={price}
                  onChangeText={setPrice}
                  style={styles.price}
                />
              </View>

              <Button title="Save Info" onPress={saveMetadata} />
            </KeyboardAwareScrollView>
          </>
        )}
      </View>
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
});


