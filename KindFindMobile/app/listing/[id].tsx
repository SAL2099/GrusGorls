// Needed Imports 
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { View, Text, Image, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import Screen from "../../components/Screen";
import { supabase } from "../../lib/supabase";
import StyledAlert from "../../components/StyledAlert";

//Function to get ListingDetails that the user has posted
export default function ListingDetail() {
    const params = useLocalSearchParams();
    const listingId = Array.isArray(params.id) ? params.id[0] : params.id; //gets id
    const numericId = Number(listingId); //converts to numeric 
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<any>(null);

    // State for styled alert
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertContent, setAlertContent] = useState({ title: "", message: "" });

    const triggerAlert = (title: string, message: string) => {
        setAlertContent({ title, message });
        setAlertVisible(true);
    };

    useEffect(() => {
        async function getUser() {
            const { data } = await supabase.auth.getUser();
            setCurrentUser(data?.user);
        }
        getUser();
    }, []);

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
                triggerAlert("Error", "Item not found or has been deleted.");
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
                        triggerAlert("Error", "You must be logged in.");
                        return;
                    }

                    const { error } = await supabase
                        .from("photos")
                        .delete()
                        .eq("id", numericId)

                    if (error) {
                        console.log("DELETE ERROR:", error);
                       triggerAlert("Error", "Could not delete: " + error.message);
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
            <Stack.Screen
                options={{
                    title: item.title,
                    headerShown: false
                }}
            />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Image
                        source={require('../../assets/images/Back Arrow.png')}
                        style={styles.backBtnImage}
                    />
                </Pressable>

                <View style={styles.card}>
                    <Image source={{ uri: item.image_url }} style={styles.image} />
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.price}>£{item.price}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.label}>Tags</Text>
                    <View style={styles.tagRow}>
                        {item.tags?.map((tag: any, index: any) => (
                            <View key={index} style={styles.tagChip}>
                                <Text style={styles.tagChipText}>{tag}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.label}>Size</Text>
                    <Text style={styles.text}>{item.size || "N/A"}</Text>

                    <Text style={styles.label}>Location</Text>
                    <Text style={styles.text}>{item.location}</Text>
                </View>

                {/* Show Pickup Timer on Detail Page */}
                {currentUser?.id === item.reserved_by && item.ready_for_pickup_at && (
                    <View style={[styles.reservationInfoCard, { backgroundColor: '#4CAF50', marginBottom: 0 }]}>
                        <Text style={styles.resLabel}>READY FOR PICKUP</Text>
                        <Text style={styles.resNumber}>{getRemainingTime(item.ready_for_pickup_at)}</Text>
                        <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>
                            Please collect this item from {item.location} before the timer runs out.
                        </Text>
                    </View>
                )}

                {currentUser?.id === item.user_id && (
                    <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                        <Text style={styles.buttonText}>Delete Listing</Text>
                    </Pressable>
                )}

                {/* Show reservation info if the user is the one who reserved it */}
                {currentUser?.id === item.reserved_by && item.reserved && (
                    <View style={styles.reservationInfoCard}>
                        <Text style={styles.resLabel}>Your Reservation Number:</Text>
                        <Text style={styles.resNumber}>{item.reservation_number}</Text>
                    </View>
                )}
            </ScrollView>

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

// Function to calculate remaining time for pickup based on the ready_for_pickup_at timestamp
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
        backgroundColor: "#eef2e4",
        borderRadius: 16,
        padding: 20,
        margin: 5
    },

    title: {
        color: "#000000",
        fontSize: 24,
        fontWeight: "900",
        paddingTop: 12
    },

    price: {
        color: "#CE6674",
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 8,
    },

    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.1)",
        marginVertical: 5
    },

    label: {
        color: "#000000",
        fontSize: 12,
        fontWeight: "800",
        textTransform: "uppercase",
        marginTop: 12,
    },

    text: {
        color: "#000000",
        fontSize: 16,
        marginTop: 4
    },

    //Delete button styles
    deleteBtn: {
        backgroundColor: "#f30678",
        padding: 15,
        marginHorizontal: 16,
        borderRadius: 12,
        marginTop: 10,
        alignItems: "center"
    },

    backBtn: {
        backgroundColor: "#CE6674",
        padding: 15,
        marginHorizontal: 16,
        marginTop: 40,
        marginBottom: 10,
        borderRadius: 12,
        alignItems: "center",
        width: 50,
    },

    backBtnImage: {
        width: 20,
        height: 20,
    },

    buttonText: { color: "#fff", fontWeight: "900" },

    //tags 
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

    //reservation styles
    reservationInfoCard: {
        backgroundColor: "#CE6674",
        padding: 20,
        marginHorizontal: 16,
        borderRadius: 12,
        marginTop: 10,
        alignItems: "center"
    },
    resLabel: {
        color: "#fff",
        fontSize: 14,
        opacity: 0.8
    },
    resNumber: {
        color: "#fff",
        fontSize: 32,
        fontWeight: "900",
        marginVertical: 10
    },
    cancelResBtn: {
        backgroundColor: "rgba(255,255,255,0.2)",
        padding: 10,
        borderRadius: 8,
        width: "100%",
        alignItems: "center"
    }
});