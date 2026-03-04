import React, { useState } from "react"; // React Native component for uploading images and metadata to Supabase
import { View, Text, Button, Image, TextInput, StyleSheet } from "react-native"; // UI components from React Native
import * as ImagePicker from "expo-image-picker"; // Expo module for picking images from the device's library
import { uploadImage } from "../lib/uploadImage"; // Custom function to handle image upload to Supabase Storage, adjust path if needed
import { supabase } from "../lib/supabase"; // Supabase client instance for database interactions, adjust path if needed
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; // Component to ensure the keyboard does not cover input fields on mobile devices

export default function UploadScreen() { // Main component for the upload screen
  const [imageUrl, setImageUrl] = useState(null); // State to hold the URL of the uploaded image
  const [title, setTitle] = useState(""); // State to hold the title input by the user
  const [description, setDescription] = useState(""); // State to hold the description input by the user
  const [size, setSize] = useState(""); // State to hold the size input by the user
  const [location, setLocation] = useState(""); // State to hold the location input by the user
  const [price, setPrice] = useState("")  // State to hold the price input by the user

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
      setImageUrl(url); // MUST be a real public URL
      console.log("SET IMAGE URL:", url);
    }
  };

  const saveMetadata = async () => { // Function to save the image metadata to the Supabase database
    const { error } = await supabase.from("photos").insert([ // Insert a new record into the "photos" table with the image URL and metadata
      {
        image_url: imageUrl,
        title,
        description,
        size,
        location,
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
    }
  };

  return ( // Render the UI for the upload screen
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
            
          <Image source={{ uri: imageUrl }} style={styles.image} />

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

          <TextInput
            placeholder="Location"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
          />

          <TextInput
            placeholder="Price"
            value={price}
            onChangeText={setPrice}
            style={styles.input}
          />

          <Button title="Save Info" onPress={saveMetadata} />
          </KeyboardAwareScrollView>
        </>
      )}
    </View>
  );
}

// Styles for the upload screen components
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: "center" },
  title: { fontSize: 22, marginBottom: 20 },
  image: { width: 250, height: 250, marginVertical: 20 },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
});
