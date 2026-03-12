import React, { useState, useRef } from "react"; // Import React and necessary hooks for managing state and refs
import {View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform} from "react-native";
import { router } from "expo-router"; // Import router for navigation between screens
import Screen from "../../components/Screen"; // Import custom Screen component for consistent styling and layout
import { supabase } from "../../lib/supabase"; // Import supabase client for authentication and database interactions

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

    const [loading, setLoading] = useState(false);

    // Refs for keyboard navigation
    const passwordRef = useRef<TextInput>(null);
    const displayNameRef = useRef<TextInput>(null);
    const storeNameRef = useRef<TextInput>(null);
    const openingTimesRef = useRef<TextInput>(null);
    const addressRef = useRef<TextInput>(null);

    // Function to handle the sign-up process
    async function signUp() {
        if (!email || !password) {
            Alert.alert("Missing info", "Please enter email and password.");
            return;
        }
        if (!displayName.trim()) {
            Alert.alert("Missing info", "Please enter a display name.");
            return;
        }
        if (role === "store" && (!storeName.trim() || !openingTimes.trim() || !address.trim())) {
            Alert.alert("Missing store info", "Please fill in store name, opening times, and address.");
            return;
        }

        // Create the user account with Supabase authentication
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;

            const userId = data.user?.id;

            if (!userId) {
                Alert.alert("Check your email", "Please confirm your email, then log in.");
                router.replace("/(auth)/login");
                return;
            }

            const profileRow: any = {
                id: userId,
                role,
                display_name: displayName.trim(),
                store_name: role === "store" ? storeName.trim() : null,
                opening_times: role === "store" ? openingTimes.trim() : null,
                address: role === "store" ? address.trim() : null,
            };

            const { error: profileError } = await supabase.from("profiles").insert([profileRow]);
            if (profileError) throw profileError;

            //redirect based on role
            if (role === "store"){
                router.replace("/(store)");
            }
            else {
                router.replace("/(tabs)");
            }

            router.replace("/(tabs)");
        } catch (e: any) {
            Alert.alert("Sign up failed", e?.message ?? "Something went wrong");
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
                                onPress={() => setRole("user")}
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

                        <TextInput
                            ref={displayNameRef}
                            placeholder="Display name"
                            placeholderTextColor="#A7A7A7"
                            style={styles.input}
                            value={displayName}
                            onChangeText={setDisplayName}
                            returnKeyType={role === "store" ? "next" : "done"}
                            onSubmitEditing={() => {
                                if (role === "store") storeNameRef.current?.focus();
                                else signUp();
                            }}
                        />

                        {role === "store" && (
                            <>
                                <TextInput
                                    ref={storeNameRef}
                                    placeholder="Store name"
                                    placeholderTextColor="#A7A7A7"
                                    style={styles.input}
                                    value={storeName}
                                    onChangeText={setStoreName}
                                    returnKeyType="next"
                                    onSubmitEditing={() => openingTimesRef.current?.focus()}
                                />

                                <TextInput
                                    ref={openingTimesRef}
                                    placeholder="Opening times (e.g. Mon–Sat 10–5)"
                                    placeholderTextColor="#A7A7A7"
                                    style={[styles.input, { height: 80 }]}
                                    value={openingTimes}
                                    onChangeText={setOpeningTimes}
                                    multiline
                                // Note: multiline inputs handle 'return' as a new line by default
                                />

                                <TextInput
                                    ref={addressRef}
                                    placeholder="Address"
                                    placeholderTextColor="#A7A7A7"
                                    style={[styles.input, { height: 80 }]}
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                />
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
});

