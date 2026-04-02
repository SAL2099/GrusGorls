import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

// Function to upload an image to Supabase Storage and return the public URL
export async function uploadImage(uri) {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    const arrayBuffer = decode(base64);
    const fileName = `image_${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, arrayBuffer, {
        contentType: "image/jpeg",
      });

    if (error) {
      console.log("UPLOAD ERROR:", error);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    console.log("PUBLIC URL:", publicUrl.publicUrl);

    return publicUrl.publicUrl;
  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    return null;
  }
}
