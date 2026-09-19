import React, { useState, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import Screen from "../../components/Screen";
import { Ionicons } from "@expo/vector-icons";
import { validatePassword, getPasswordRequirements } from "../../lib/validation";
import StyledAlert from "../../components/StyledAlert";


//ResetPasswordScreen allowing password resets
export default function ResetPasswordScreen() {
    const { email } = useLocalSearchParams();

    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Refs for keyboard navigation
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    // State for styled alert
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertContent, setAlertContent] = useState({ title: "", message: "" });

    const triggerAlert = (title: string, message: string) => {
        setAlertContent({ title, message });
        setAlertVisible(true);
    };

    async function handleReset() {
        if (!token || !password || !confirmPassword) {
            triggerAlert("Missing info", "Please fill in all fields.");
            return;
        }

        const validation = validatePassword(password);
        if (!validation.isValid) {
            triggerAlert("Weak Password", validation.error);
            return;
        }

        if (password !== confirmPassword) {
            triggerAlert("Error", "Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email as string,
                token: token,
                type: 'recovery',
            });

            if (verifyError) throw verifyError;

            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            triggerAlert("Success!", "Your password has been updated.");
            router.replace("/(auth)/login");

        } catch (e: any) {
            triggerAlert("Reset Failed", e.message || "Invalid code or request expired.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Screen>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="key-outline" size={28} color="#fff" />
                        </View>

                        <Text style={styles.title}>Reset password</Text>
                        <Text style={styles.subtitle}>Enter the code sent to {email}</Text>

                        <View style={styles.card}>
                            <Text style={styles.label}>Verification code</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="shield-checkmark-outline" size={18} color="#A7A7A7" style={styles.inputIcon} />
                                <TextInput
                                    placeholder="6-digit code"
                                    placeholderTextColor="#A7A7A7"
                                    keyboardType="number-pad"
                                    style={styles.input}
                                    value={token}
                                    onChangeText={setToken}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>

                            <Text style={styles.label}>New password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={18} color="#A7A7A7" style={styles.inputIcon} />
                                <TextInput
                                    ref={passwordRef}
                                    placeholder="New password"
                                    placeholderTextColor="#A7A7A7"
                                    secureTextEntry={!showPassword}
                                    style={[styles.input, { flex: 1 }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    returnKeyType="next"
                                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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

                            {/* Password Checklist */}
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

                            <Text style={styles.label}>Confirm new password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={18} color="#A7A7A7" style={styles.inputIcon} />
                                <TextInput
                                    ref={confirmPasswordRef}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#A7A7A7"
                                    secureTextEntry={!showPassword}
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={handleReset}
                                />
                            </View>

                            <Pressable
                                style={[styles.button, loading && { opacity: 0.7 }]}
                                onPress={handleReset}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? "Updating..." : "Update password"}
                                </Text>
                            </Pressable>
                        </View>

                        <Pressable onPress={() => router.back()}>
                            <Text style={styles.link}>Back to login</Text>
                        </Pressable>

                        {/* The Styled Alert */}
                        <StyledAlert
                            visible={alertVisible}
                            title={alertContent.title}
                            message={alertContent.message}
                            onClose={() => setAlertVisible(false)}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}


const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
        paddingBottom: 40
    },

    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#CE6674",
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
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
        marginBottom: 20,
        paddingHorizontal: 10,
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
        justifyContent: 'center',
        alignItems: 'center',
    },

    requirementContainer: {
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    requirementText: {
        fontSize: 12,
        marginBottom: 4,
    },

    button: {
        marginTop: 6,
        backgroundColor: "#CE6674",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center"
    },
    buttonText: { color: "#fff", fontWeight: "900", fontSize: 15 },
    link: {
        color: "#fff",
        opacity: 0.8,
        textAlign: "center"
    },
});