import React, { useState, useRef } from "react"; // Import necessary hooks from React for managing state and refs
import {View, Text, TextInput, Pressable, StyleSheet, Alert, Image, ScrollView, KeyboardAvoidingView, Platform,} from "react-native";
import { router } from "expo-router"; // Import the router from expo-router for navigation between screens
import Screen from "../../components/Screen"; // Import a custom Screen component for consistent styling and layout across screens
import { supabase } from "../../lib/supabase";

// The LoginScreen component provides a user interface for users to log in to their accounts using email and password authentication
export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Ref for keyboard navigation
    const passwordRef = useRef<TextInput>(null);

    // Function to handle the login process when the user submits their email and password
    async function login() {
        if (!email || !password) {
            Alert.alert("Missing info", "Please enter email and password.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            router.replace("/(tabs)");
        } catch (e: any) {
            Alert.alert("Login failed", e?.message ?? "Try again");
        } finally {
            setLoading(false);
        }
    }

    // Render the login form with inputs for email and password
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
                        <Image
                            source={require("../../assets/images/Logo2.jpg")}
                            style={styles.image}
                        />

                        <Text style={styles.title}>Log in</Text>

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
                            blurOnSubmit={false}
                        />

                        <TextInput
                            ref={passwordRef}
                            placeholder="Password"
                            placeholderTextColor="#A7A7A7"
                            secureTextEntry
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            returnKeyType="done"
                            onSubmitEditing={login}
                        />

                        <Pressable style={styles.button} onPress={login} disabled={loading}>
                            <Text style={styles.buttonText}>
                                {loading ? "Logging in..." : "Log in"}
                            </Text>
                        </Pressable>

                        <Pressable onPress={() => router.push("/(auth)/signup")}>
                            <Text style={styles.link}>No account? Create one</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}

// Define styles for the LoginScreen component using StyleSheet
const styles = StyleSheet.create({
    // Style for the scroll view content to allow it to grow and center the content
    scrollContent: {
        flexGrow: 1,
    },

    // Container style for the whole screen, centers the content and adds padding
    container: {
        flex: 1,
        padding: 16,
        justifyContent: "center",
        paddingBottom: 20,
    },
    title: { color: "#fff", fontSize: 22, fontWeight: "900", marginBottom: 14 },

    // Style for the input fields, with a dark background, rounded corners, and white text
    input: {
        backgroundColor: "#121C0C",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: "#fff",
        marginBottom: 10,
    },

    // Style for the login button, with a pink background and white text
    button: {
        marginTop: 6,
        backgroundColor: "#f30678",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    buttonText: { color: "#fff", fontWeight: "900" },

    link: { color: "#fff", opacity: 0.8, marginTop: 14, textAlign: "center" },

    // Style for the logo image at the top of the login screen, centered with rounded corners
    image: {
        width: 160,
        height: 160,
        alignSelf: "center",
        borderRadius: 10,
        marginBottom: 30,
    },
});

