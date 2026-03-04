import React, { useState } from "react";
import { View, Text, Button, Image, TextInput, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "../lib/uploadImage";
import { supabase } from "../lib/supabase";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function UploadScreen() {
  const [imageUrl, setImageUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("")

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
      setImageUrl(url); // MUST be a real public URL
      console.log("SET IMAGE URL:", url);
    }
  };

  const saveMetadata = async () => {
    const { error } = await supabase.from("photos").insert([
      {
        image_url: imageUrl,
        title,
        description,
        size,
        location,
        price,
      },
    ]);

    if (error) {
      console.log("DB ERROR:", error);
      alert("Failed to save info");
    } else {
      alert("Saved!");
      setTitle("");
      setDescription("");
      setImageUrl(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload an Image</Text>

      <Button title="Pick Image" onPress={pickAndUpload} />

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
