import React, { useState, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import Screen from "../../components/Screen";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import StyledAlert from "../../components/StyledAlert";

// The LoginScreen component provides a user interface for users to log in to their accounts using email and password authentication
export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Ref for keyboard navigation
    const passwordRef = useRef<TextInput>(null);

    // State for styled alert
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertContent, setAlertContent] = useState({ title: "", message: "" });

    const triggerAlert = (title: string, message: string) => {
        setAlertContent({ title, message });
        setAlertVisible(true);
    };

    // Function to handle the login process when the user submits their email and password
    async function login() {
        if (!email || !password) {
            triggerAlert("Missing info", "Please enter email and password.");
            return;
        }

        setLoading(true);
        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) throw error;

            const user = authData.user;
            if (!user) throw new Error("No user returned");

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;

            if (profile.role === "store") {
                router.replace("../(store)/tabs");
            }
            else {
                router.replace("../(tabs)");
            }


        } catch (e: any) {
            triggerAlert("Login failed", e?.message ?? "Try again");
        } finally {
            setLoading(false);
        }
    }

    // Function to handle the forgot password functionality, which sends a reset code to the user's email and navigates them to the reset password screen
    async function handleForgotPassword() {
        if (!email) {
            triggerAlert("Email required", "Please enter your email address to receive a reset code.");
            return;
        }

        setLoading(true);
        try {
            // This sends a 6-digit code to the user's email
            const { error } = await supabase.auth.resetPasswordForEmail(email);

            if (error) throw error;

            triggerAlert("Code Sent", "Check your inbox for a 6-digit verification code.");

            // Navigate to reset screen and pass the email so the user doesn't have to type it again
            router.push({
                pathname: "/(auth)/reset-password",
                params: { email: email }
            });
        } catch (e: any) {
            triggerAlert("Error", e.message);
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

                        <Text style={styles.title}>Welcome back</Text>
                        <Text style={styles.subtitle}>Log in to keep browsing and reserving finds near you</Text>

                        <View style={styles.card}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={18} color="#A7A7A7" style={styles.inputIcon} />
                                <TextInput
                                    placeholder="you@example.com"
                                    placeholderTextColor="#A7A7A7"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>

                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={18} color="#A7A7A7" style={styles.inputIcon} />
                                <TextInput
                                    ref={passwordRef}
                                    placeholder="Your password"
                                    placeholderTextColor="#A7A7A7"
                                    secureTextEntry={!showPassword}
                                    style={[styles.input, { flex: 1 }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={login}
                                />
                                <Pressable
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={18}
                                        color="#A7A7A7"
                                    />
                                </Pressable>
                            </View>

                            {/* Forgot Password Link */}
                            <Pressable
                                onPress={handleForgotPassword}
                                style={styles.forgotPasswordContainer}
                            >
                                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                            </Pressable>

                            <Pressable style={styles.button} onPress={login} disabled={loading}>
                                <Text style={styles.buttonText}>
                                    {loading ? "Logging in..." : "Log in"}
                                </Text>
                            </Pressable>
                        </View>

                        <Pressable onPress={() => router.push("/(auth)/signup")}>
                            <Text style={styles.link}>No account? Create one</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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

// Define styles for the LoginScreen component using StyleSheet
const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
    },

    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
        paddingBottom: 20,
    },

    title: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 6,
    },

    subtitle: {
        color: "#fff",
        opacity: 0.7,
        fontSize: 13,
        textAlign: "center",
        marginBottom: 24,
        paddingHorizontal: 20,
        lineHeight: 18,
    },

    // Card wrapping the form fields, matching the app's card language elsewhere
    card: {
        backgroundColor: "#121C0C",
        borderRadius: 16,
        padding: 18,
        outlineColor: "rgba(197, 103, 103, 0.4)",
        outlineWidth: 1,
        marginBottom: 20,
    },

    label: {
        color: "#fff",
        opacity: 0.8,
        fontSize: 12,
        fontWeight: "800",
        textTransform: "uppercase",
        marginBottom: 6,
    },

    // Wrapper for input + icon(s)
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 12,
        marginBottom: 14,
        paddingHorizontal: 12,
    },

    inputIcon: {
        marginRight: 8,
    },

    input: {
        flex: 1,
        paddingVertical: 12,
        color: "#fff",
    },

    eyeIcon: {
        paddingLeft: 10,
        justifyContent: "center",
        alignItems: "center",
    },

    button: {
        marginTop: 4,
        backgroundColor: "#CE6674",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    buttonText: { color: "#fff", fontWeight: "900", fontSize: 15 },

    link: {
        color: "#fff",
        opacity: 0.8,
        textAlign: "center",
        fontSize: 13,
    },

    image: {
        width: 120,
        height: 120,
        alignSelf: "center",
        borderRadius: 24,
        marginBottom: 20,
    },

    //forgot password
    forgotPasswordContainer: {
        alignSelf: "flex-end",
        marginBottom: 16,
        marginTop: -6,
    },
    forgotPasswordText: {
        color: "#CE6674",
        fontSize: 12,
        fontWeight: "700",
    },
});