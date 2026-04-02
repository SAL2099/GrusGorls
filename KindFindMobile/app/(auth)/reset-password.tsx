import React, { useState, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import Screen from "../../components/Screen";
import { Ionicons } from "@expo/vector-icons";
import { validatePassword, getPasswordRequirements } from "../../lib/validation";

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

    async function handleReset() {
        if (!token || !password || !confirmPassword) {
            Alert.alert("Missing info", "Please fill in all fields.");
            return;
        }

        const validation = validatePassword(password);
        if (!validation.isValid) {
            Alert.alert("Weak Password", validation.error);
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
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

            Alert.alert("Success!", "Your password has been updated.");
            router.replace("/(auth)/login");

        } catch (e: any) {
            Alert.alert("Reset Failed", e.message || "Invalid code or request expired.");
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
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>Enter the code sent to {email}</Text>

                        {/* 6-Digit Token Input */}
                        <TextInput
                            placeholder="6-Digit Code"
                            placeholderTextColor="#A7A7A7"
                            style={styles.input}
                            value={token}
                            onChangeText={setToken}
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                        />

                        {/* Password Input */}
                        <View style={styles.passwordContainer}>
                            <TextInput
                                ref={passwordRef}
                                placeholder="New Password"
                                placeholderTextColor="#A7A7A7"
                                secureTextEntry={!showPassword}
                                style={[styles.Passwordinput, { flex: 1 }]}
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
                                    size={20}
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

                        {/* Confirm Password Input */}
                        <TextInput
                            ref={confirmPasswordRef}
                            placeholder="Confirm New Password"
                            placeholderTextColor="#A7A7A7"
                            secureTextEntry={!showPassword}
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            returnKeyType="done"
                            onSubmitEditing={handleReset}
                        />

                        <Pressable 
                            style={[styles.button, loading && { opacity: 0.7 }]} 
                            onPress={handleReset}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? "Updating..." : "Update Password"}
                            </Text>
                        </Pressable>

                        <Pressable onPress={() => router.back()}>
                            <Text style={styles.link}>Back to Login</Text>
                        </Pressable>
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
        padding: 16,
        justifyContent: "center",
        paddingBottom: 40
    },
    title: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "900",
        marginBottom: 8
    },
    subtitle: {
        color: "#A7A7A7",
        fontSize: 14,
        marginBottom: 24,
    },
    input: {
        backgroundColor: "#121C0C",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: "#fff",
        marginBottom: 10,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#121C0C", 
        borderRadius: 12,
        marginBottom: 10, 
        height: 50, 
        overflow: 'hidden',
    },
    Passwordinput: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: "#fff",
    },
    eyeIcon: {
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    requirementContainer: {
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    requirementText: {
        fontSize: 12,
        marginBottom: 4,
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
        marginTop: 20,
        textAlign: "center"
    },
});