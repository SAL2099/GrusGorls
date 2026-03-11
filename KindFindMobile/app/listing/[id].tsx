// Needed Imports 
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { View, Text, Image, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import Screen from "../../components/Screen";
import { supabase } from "../../lib/supabase";

//Function to get ListingDetails that the user has posted
export default function ListingDetail() {
    const params = useLocalSearchParams();
    const listingId = Array.isArray(params.id) ? params.id[0] : params.id; //gets id
    const numericId = Number(listingId); //converts to numeric 
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Fetch fresh data from Supabase
    useEffect(() => {
        async function fetchListing() {
            setLoading(true);
            const { data, error } = await supabase
                .from("photos")
                .select("*")
                .eq("id", numericId)
                .single();

            if (error || !data) {
                Alert.alert("Error", "Item not found or has been deleted.");
                router.back();
            } else {
                setItem(data);
            }
            setLoading(false);
        }
        fetchListing();
    }, [numericId]);

    //Function to deal with deleting uploads from your profile and database
    async function handleDelete() {
        Alert.alert("Delete", "Are you sure you want to delete this listing?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    const { data: userData } = await supabase.auth.getUser();
                    const user = userData?.user;

                    if (!user) {
                        Alert.alert("Error", "You must be logged in.");
                        return;
                    }

                    const { error } = await supabase
                        .from("photos")
                        .delete()
                        .eq("id", numericId)
                        .eq("user_id", user.id);

                    if (error) {
                        console.log("DELETE ERROR:", error);
                        Alert.alert("Error", "Could not delete: " + error.message);
                    } else {
                        router.back();
                    }
                },
            },
        ]);
    }

    //Deals with if its loading 
    if (loading) {
        return (
            <Screen>
                <View style={styles.center}><ActivityIndicator size="large" color="#CE6674" /></View>
            </Screen>
        );
    }

    if (!item) return null;

    //Layout for the page
    return (
        <Screen>
            <Stack.Screen options={{ title: item.title }} />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.card}>
                    <Image source={{ uri: item.image_url }} style={styles.image} />
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.price}>£{item.price}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.label}>Description</Text>
                    <Text style={styles.text}>{item.description}</Text>

                    <Text style={styles.label}>Size</Text>
                    <Text style={styles.text}>{item.size || "N/A"}</Text>

                    <Text style={styles.label}>Location</Text>
                    <Text style={styles.text}>{item.location}</Text>
                </View>

                <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                    <Text style={styles.buttonText}>Delete Listing</Text>
                </Pressable>
            </ScrollView>
        </Screen>
    );
}

// Styles for consistancy
const styles = StyleSheet.create({

    //Used to center the content
    center: { 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center" 
    },
    scrollContainer: { paddingBottom: 20 },
    image: { 
        width: "100%", 
        height: 300, 
        borderRadius: 10, 
        marginBottom: 12 
    },

    //Container for the listing content
    card: { 
        backgroundColor: "#121C0C", 
        borderRadius: 16, 
        padding: 20, 
        margin: 16 
    },

    title: { 
        color: "#fff", 
        fontSize: 24, 
        fontWeight: "900", 
        paddingTop: 12 
    },

    price: { 
        color: "#CE6674", 
        fontSize: 20, 
        fontWeight: "bold", 
        marginTop: 8 
    },

    divider: { 
        height: 1, 
        backgroundColor: "rgba(255,255,255,0.1)", 
        marginVertical: 15 
    },

    label: {
        color: "#A7A7A7", 
        fontSize: 12, 
        fontWeight: "800", 
        textTransform: "uppercase", 
        marginTop: 12 
    },

    text: { 
        color: "#fff", 
        fontSize: 16, 
        marginTop: 4 
    },

    //Delete button styles
    deleteBtn: { 
        backgroundColor: "#f30678", 
        padding: 15, 
        marginHorizontal: 16, 
        borderRadius: 12, 
        alignItems: "center" 
    },

    buttonText: { color: "#fff", fontWeight: "900" }
});