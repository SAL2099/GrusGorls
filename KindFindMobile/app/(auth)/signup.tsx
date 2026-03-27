import React, { useState, useRef, useEffect } from "react"; // Import React and necessary hooks for managing state and refs
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { router } from "expo-router"; // Import router for navigation between screens
import Screen from "../../components/Screen"; // Import custom Screen component for consistent styling and layout
import { supabase } from "../../lib/supabase"; // Import supabase client for authentication and database interactions
import * as Location from "expo-location"; // Import Expo location for getting the user's current location
import { Dropdown } from "react-native-element-dropdown"; // Dropdown component for selecting nearby shops
import { fetchOsmShops } from "../../lib/osmService"; // Function to fetch nearby charity shops
import { validatePassword, getPasswordRequirements } from "../../lib/validation";

// The SignUpScreen component allows users to create a new account, either as a regular user or a store owner, and handles the sign-up logic
export default function SignUpScreen() {
    const [role, setRole] = useState<"user" | "store">("user");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    // store-only
    const [storeName, setStoreName] = useState("");
    const [openingTimes, setOpeningTimes] = useState("");
    const [address, setAddress] = useState("");
    const [shops, setShops] = useState<any[]>([]);
    const [loadingShops, setLoadingShops] = useState(false);
    const [selectedShop, setSelectedShop] = useState("");

    const [loading, setLoading] = useState(false);

    // Refs for keyboard navigation
    const passwordRef = useRef<TextInput>(null);
    const displayNameRef = useRef<TextInput>(null);

    // Load nearby shops when the store role is selected
    useEffect(() => {
        async function loadShops() {
            if (role !== "store") return;

            try {
                setLoadingShops(true);

                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                    Alert.alert("Location needed", "Please allow location access to find your store.");
                    return;
                }


                const loc = await Location.getCurrentPositionAsync({});
                const lat = loc.coords.latitude;
                const lng = loc.coords.longitude;

                const results = await fetchOsmShops(lat, lng, 5000);

                // Get stores already registered
                const { data: takenStores } = await supabase
                    .from("profiles")
                    .select("store_id")
                    .not("store_id", "is", null);


                // Convert taken stores to a list to check for duplicates
                const takenIds = (takenStores ?? []).map((s) => String(s.store_id));

                const availableShops = (results ?? []).filter(
                    (shop: any) => !takenIds.includes(String(shop.id))
                );

                setShops(availableShops);

            } catch (error) {
                console.log("Failed to fetch nearby shops:", error);
                Alert.alert("Error", "Could not load nearby shops.");
            } finally {
                setLoadingShops(false);
            }
        }

        loadShops();
    }, [role]);

    // Function to handle dropdown selection for a store
    function handleStoreSelection(item: any) {
        if (item.value === "manual") {
            Alert.alert(
                "Store not listed",
                "Please contact support to have your store added."
            );
            setSelectedShop("");
            setStoreName("");
            setAddress("");
            setOpeningTimes("");
            return;
        }

        setSelectedShop(item.value);

        const chosenShop = shops.find((shop) => shop.id === item.value);

        if (chosenShop) {
            setStoreName(chosenShop.name ?? "");
            setAddress(chosenShop.address ?? "");
            setOpeningTimes(chosenShop.opening_hours ?? "");
        }
    }



    // Function to handle the sign-up process
    async function signUp() {
        // Ensures fields are filled
        if (!email || !password || !displayName.trim()) {
            Alert.alert("Missing info", "Please fill in all fields.");
            return;
        }

        const validation = validatePassword(password);

        if (!validation.isValid) {
            Alert.alert(
                "Weak Password",
                validation.error
            );
            return;
        }

        if (role === "store" && !selectedShop) {
            Alert.alert("Store missing", "Please select a store.");
            return;
        }

        setLoading(true);

        try {
            // Check profiles to ensure a store isn't making two accounts
            if (role === "store") {
                console.log("Selected shop:", selectedShop);
                const { data: existingStore } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("store_id", String(selectedShop))
                    .maybeSingle();

                console.log("Existing store result:", existingStore);

                if (existingStore) {
                    setLoading(false);
                    return Alert.alert("Taken", "This store is already registered.");
                }
            }

            // Create authAccount
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                setLoading(false);
                return Alert.alert("Sign up failed", authError.message);
            }

            const userId = authData.user?.id;

            // This is turned off for now but the code is here for when we turn on email confirm
            if (!userId) {
                Alert.alert("Verify Email", "Please check your inbox to confirm your account.");
                router.replace("/(auth)/login");
                return;
            }

            // Create profile
            const { error: profileError } = await supabase.from("profiles").insert([{
                id: userId,
                role,
                display_name: displayName.trim(),
                store_id: role === "store" ? String(selectedShop) : null,
                store_name: role === "store" ? storeName.trim() : null,
                opening_times: role === "store" ? openingTimes.trim() : null,
                address: role === "store" ? address.trim() : null,
            }]);

            if (profileError) {
                console.log("PROFILE ERROR: ", profileError);

                //Sign them out if another account is registered
                await supabase.auth.signOut();

                if (profileError.code === "23505") {
                    throw new Error("This store was has been registered by another user.");
                }
                throw profileError;
            }

            //Only happens if a store signs up
            router.replace(role === "store" ? "/(store)/tabs" : "/(tabs)");

        } catch (e: any) {
            Alert.alert("Sign up failed", e?.message ?? "An error occurred");
        } finally {
            setLoading(false);
        }
    }

    // Render the sign-up form with inputs for email, password, display name, and additional store info if the store role is selected
    return (
        <Screen>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        <Text style={styles.title}>Create account</Text>

                        <View style={styles.roleRow}>
                            <Pressable
                                style={[styles.rolePill, role === "user" && styles.rolePillActive]}
                                onPress={() => {
                                    setRole("user");
                                    setSelectedShop("");
                                }}
                            >
                                <Text style={styles.roleText}>User</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.rolePill, role === "store" && styles.rolePillActive]}
                                onPress={() => setRole("store")}
                            >
                                <Text style={styles.roleText}>Store</Text>
                            </Pressable>
                        </View>

                        <TextInput
                            placeholder="Email"
                            placeholderTextColor="#A7A7A7"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                        />

                        <TextInput
                            ref={passwordRef}
                            placeholder="Password"
                            placeholderTextColor="#A7A7A7"
                            secureTextEntry
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            returnKeyType="next"
                            onSubmitEditing={() => displayNameRef.current?.focus()}
                        />

                        {/*Password checklist */}
                        {password.length > 0 && (
                            <View style={styles.requirementContainer}>
                                {getPasswordRequirements(password).map((req, index) => (
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

                        <TextInput
                            ref={displayNameRef}
                            placeholder="Display name"
                            placeholderTextColor="#A7A7A7"
                            style={styles.input}
                            value={displayName}
                            onChangeText={setDisplayName}
                            returnKeyType="done"
                            onSubmitEditing={signUp}

                        />

                        {role === "store" && (
                            <>
                                {loadingShops ? (
                                    <ActivityIndicator size="small" color="#fff" style={{ marginBottom: 10 }} />
                                ) : (
                                    <Dropdown
                                        style={styles.dropdown}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        inputSearchStyle={styles.inputSearchStyle}
                                        data={[
                                            ...shops.map((shop) => ({
                                                label: shop.displayName ?? shop.name ?? "Unnamed shop",
                                                value: shop.id,
                                            })),
                                            { label: "My store isn’t listed", value: "manual" }
                                        ]}
                                        search
                                        maxHeight={300}
                                        labelField="label"
                                        valueField="value"
                                        placeholder="Search or select your store"
                                        searchPlaceholder="Search for your store..."
                                        value={selectedShop}
                                        onChange={handleStoreSelection}
                                    />
                                )}
                            </>
                        )}

                        <Pressable style={styles.button} onPress={signUp} disabled={loading}>
                            <Text style={styles.buttonText}>{loading ? "Creating..." : "Sign up"}</Text>
                        </Pressable>

                        <Pressable onPress={() => router.push("/(auth)/login")}>
                            <Text style={styles.link}>Already have an account? Log in</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}


// Define styles for the SignUpScreen component using StyleSheet
const styles = StyleSheet.create({
    // Style for the scroll view content to allow it to grow and center the form
    scrollContent: {
        flexGrow: 1,
    },

    // Container style for the form, with padding and centering
    container: {
        flex: 1,
        padding: 16,
        justifyContent: "center",
        paddingBottom: 40
    },

    // Style for the title text at the top of the form
    title: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "900",
        marginBottom: 14
    },

    roleRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 12
    },

    rolePill: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center"
    },

    rolePillActive: { backgroundColor: "#CE6674" },
    roleText: { color: "#fff", fontWeight: "900" },

    input: {
        backgroundColor: "#121C0C",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: "#fff",
        marginBottom: 10,
    },

    dropdown: {
        height: 50,
        backgroundColor: "#121C0C",
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },

    placeholderStyle: {
        fontSize: 16,
        color: "#A7A7A7",
    },

    selectedTextStyle: {
        fontSize: 16,
        color: "#fff",
    },

    inputSearchStyle: {
        height: 40,
        fontSize: 16,
        borderRadius: 8,
        color: "#000",
        backgroundColor: "#fff",
    },

    button: {
        marginTop: 6,
        backgroundColor: "#f30678",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center"
    },

    buttonText: { color: "#fff", fontWeight: "900" },
    link: {
        color: "#fff",
        opacity: 0.8,
        marginTop: 14,
        textAlign: "center"
    },

    //password checklist
    requirementContainer: {
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    requirementText: {
        fontSize: 12,
        marginBottom: 4,
        fontFamily: 'System', 
    },
});
