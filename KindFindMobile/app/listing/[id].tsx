import { useLocalSearchParams, Stack } from "expo-router";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import Screen from "../../components/Screen";

export default function ListingDetail() {
    const item = useLocalSearchParams();

    return (
        <Screen>
            <Stack.Screen options={{ title: (item.title as string) || "Details" }} />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Main image */}
                <View style={styles.card}>
                    <Image source={{ uri: item.image_url as string }} style={styles.image} />
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
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    // Style for the ScrollView content container
    scrollContainer: { paddingBottom: 20 },

    // Style for the main image of the listing, with full width, fixed height, and rounded corners
    image: {
        width: "100%",
        height: 300,
        borderRadius: 10
    },

    card: {
        backgroundColor: "#121C0C",
        borderRadius: 16,
        padding: 20,
        margin: 16,
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
});