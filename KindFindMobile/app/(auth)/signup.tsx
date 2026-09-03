import React, { useState, useRef, useEffect } from "react"; // Import React and necessary hooks for managing state and refs
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { router } from "expo-router"; // Import router for navigation between screens
import Screen from "../../components/Screen"; // Import custom Screen component for consistent styling and layout
import { supabase } from "../../lib/supabase"; // Import supabase client for authentication and database interactions
import { validatePassword, getPasswordRequirements } from "../../lib/validation";
import { Ionicons } from "@expo/vector-icons"; //Icon
import StyledAlert from "../../components/StyledAlert";


// The SignUpScreen component allows users to create a new account, either as a regular user or a store owner, and handles the sign-up logic
export default function SignUpScreen() {
    const [role, setRole] = useState<"user" | "store">("user");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    // Store access code — stores need a code from our website, and that code is tied
    // to one specific shop (store_id/store_name/etc come from the code itself, not a
    // shop picker), so a code can only ever register the exact store it was issued for.
    const [storeAccessCode, setStoreAccessCode] = useState("");
    const [codeVerified, setCodeVerified] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [verifiedStore, setVerifiedStore] = useState<{
        id: number;
        store_id: string;
        store_name: string;
        opening_times: string | null;
        address: string | null;
    } | null>(null);

    const [loading, setLoading] = useState(false);

    // Refs for keyboard navigation
    const passwordRef = useRef<TextInput>(null);
    const displayNameRef = useRef<TextInput>(null);

    //Password
    const [showPassword, setShowPassword] = useState(false);

    // State for styled alert
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertContent, setAlertContent] = useState({ title: "", message: "" });

    const triggerAlert = (title: string, message: string) => {
        setAlertContent({ title, message });
        setAlertVisible(true);
    };

    // Show a one-time popup explaining the access code requirement whenever
    // someone switches to the Store tab without already having a verified code.
    useEffect(() => {
        if (role === "store" && !codeVerified) {
            triggerAlert(
                "Store access code needed",
                "To register as a store you'll need an access code from us, specific to your shop. Please visit our website to request one, then enter it below."
            );
        }
    }, [role]);

    // Verifies the entered access code against Supabase. The code itself carries the
    // store's identity (store_id/name/address/opening times), so once verified we
    // already know exactly which shop this account belongs to — no shop picker needed.
    async function verifyAccessCode() {
        const cleanCode = storeAccessCode.trim().toUpperCase();

        if (!cleanCode) {
            triggerAlert("Code required", "Please enter the access code you received from our website.");
            return;
        }

        setVerifyingCode(true);

        const { data, error } = await supabase
            .from("invite_codes")
            .select("id, used, store_id, store_name, opening_times, address")
            .eq("code", cleanCode)
            .maybeSingle();

        setVerifyingCode(false);

        if (error || !data) {
            triggerAlert("Invalid code", "That code wasn't recognised. Please check it or contact us via our website.");
            return;
        }

        if (data.used) {
            triggerAlert("Code already used", "This code has already been used to register a store. Please contact us via our website for a new one.");
            return;
        }

        setVerifiedStore(data);
        setCodeVerified(true);
    }

    // Lets someone re-enter a different code if they typed the wrong one
    function changeCode() {
        setCodeVerified(false);
        setVerifiedStore(null);
        setStoreAccessCode("");
    }

    //Function for signing up a new user or store owner, creates an account with Supabase, and inserting the user's profile into the database
    async function signUp() {
        if (!email || !password || !displayName.trim()) {
            triggerAlert("Missing info", "Please fill in all fields.");
            return;
        }

        const validation = validatePassword(password);
        if (!validation.isValid) {
            triggerAlert("Weak Password", validation.error);
            return;
        }

        if (role === "store" && (!codeVerified || !verifiedStore)) {
            triggerAlert("Access code needed", "Please verify your store access code before signing up.");
            return;
        }

        setLoading(true);

        try {
            if (role === "store" && verifiedStore) {
                const { data: existingStore } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("store_id", verifiedStore.store_id)
                    .maybeSingle();

                if (existingStore) {
                    setLoading(false);
                    return triggerAlert("Taken", "This store is already registered.");
                }
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            const userId = authData.user?.id;

            if (!userId) {
                triggerAlert("Verify Email", "Please check your inbox to confirm your account.");
                router.replace("/(auth)/login");
                return;
            }

            // Atomically claim the access code (only succeeds if it's still unused) before
            // creating the profile, so two people can't redeem the same code in a race.
            if (role === "store" && verifiedStore) {
                const { data: claimed, error: claimError } = await supabase
                    .from("invite_codes")
                    .update({ used: true, used_by: userId, used_at: new Date().toISOString() })
                    .eq("id", verifiedStore.id)
                    .eq("used", false)
                    .select("id");

                if (claimError || !claimed || claimed.length === 0) {
                    await supabase.auth.signOut();
                    throw new Error("This code was just used by someone else. Please request a new one from our website.");
                }
            }

            const { error: profileError } = await supabase.from("profiles").insert([{
                id: userId,
                role,
                display_name: displayName.trim(),
                store_id: role === "store" && verifiedStore ? verifiedStore.store_id : null,
                store_name: role === "store" && verifiedStore ? verifiedStore.store_name : null,
                opening_times: role === "store" && verifiedStore ? verifiedStore.opening_times : null,
                address: role === "store" && verifiedStore ? verifiedStore.address : null,
            }]);

            if (profileError) {
                console.log("PROFILE ERROR: ", profileError);

                await supabase.auth.signOut();

                if (profileError.code === "23505") {
                    throw new Error("This store has been registered by another user.");
                }
                throw profileError;
            }

            router.replace(role === "store" ? "/(store)/tabs" : "/(tabs)");

        } catch (e: any) {
            triggerAlert("Sign up failed", e?.message ?? "An error occurred");
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

                        <View style={styles.passwordContainer}>
                            <TextInput
                                ref={passwordRef}
                                placeholder="Password"
                                placeholderTextColor="#A7A7A7"
                                secureTextEntry={!showPassword}
                                style={[styles.Passwordinput, { flex: 1, marginBottom: 0 }]}
                                value={password}
                                onChangeText={setPassword}
                                returnKeyType="next"
                                onSubmitEditing={() => displayNameRef.current?.focus()}
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

                        {/* Store signup flow: access code gate, tied to one specific shop */}
                        {role === "store" && !codeVerified && (
                            <View style={styles.codeCard}>
                                <Text style={styles.codeCardTitle}>Store access code required</Text>
                                <Text style={styles.codeCardText}>
                                    Store accounts need a one-time code from our website, specific to your shop. Visit our site to request one, then enter it below.
                                </Text>

                                <TextInput
                                    placeholder="Enter access code"
                                    placeholderTextColor="#A7A7A7"
                                    autoCapitalize="characters"
                                    style={[styles.input, { marginTop: 10, marginBottom: 10 }]}
                                    value={storeAccessCode}
                                    onChangeText={setStoreAccessCode}
                                    returnKeyType="done"
                                    onSubmitEditing={verifyAccessCode}
                                />

                                <Pressable
                                    style={[styles.button, { marginTop: 0, backgroundColor: "#CE6674" }]}
                                    onPress={verifyAccessCode}
                                    disabled={verifyingCode}
                                >
                                    <Text style={styles.buttonText}>
                                        {verifyingCode ? "Checking..." : "Verify Code"}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {/* Once the code is verified, show which shop this account will be — read-only, it came from the code */}
                        {role === "store" && codeVerified && verifiedStore && (
                            <View style={[styles.codeCard, { backgroundColor: "rgba(76, 175, 80, 0.12)", borderColor: "rgba(76, 175, 80, 0.4)" }]}>
                                <Text style={styles.codeCardTitle}>Registering as:</Text>
                                <Text style={styles.verifiedStoreName}>{verifiedStore.store_name}</Text>
                                {verifiedStore.address ? (
                                    <Text style={styles.codeCardText}>{verifiedStore.address}</Text>
                                ) : null}
                                {verifiedStore.opening_times ? (
                                    <Text style={styles.codeCardText}>{verifiedStore.opening_times}</Text>
                                ) : null}

                                <Pressable onPress={changeCode} style={{ marginTop: 10 }}>
                                    <Text style={styles.link}>Not your shop? Enter a different code</Text>
                                </Pressable>
                            </View>
                        )}

                        <Pressable
                            style={[styles.button, role === "store" && !codeVerified && styles.buttonDisabled]}
                            onPress={signUp}
                            disabled={loading || (role === "store" && !codeVerified)}
                        >
                            <Text style={styles.buttonText}>{loading ? "Creating..." : "Sign up"}</Text>
                        </Pressable>

                        <Pressable onPress={() => router.push("/(auth)/login")}>
                            <Text style={styles.link}>Already have an account? Log in</Text>
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

    //tags for user/store selection
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

    // Store access code card
    codeCard: {
        backgroundColor: "rgba(206, 102, 116, 0.12)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(206, 102, 116, 0.4)",
        padding: 14,
        marginBottom: 10,
    },

    codeCardTitle: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 15,
        marginBottom: 6,
    },

    codeCardText: {
        color: "#fff",
        opacity: 0.85,
        fontSize: 13,
        lineHeight: 18,
    },

    verifiedStoreName: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 17,
        marginBottom: 4,
    },

    button: {
        marginTop: 6,
        backgroundColor: "#f30678",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center"
    },

    buttonDisabled: {
        opacity: 0.5,
    },

    buttonText: { color: "#fff", fontWeight: "900" },
    link: {
        color: "#fff",
        opacity: 0.8,
        marginTop: 14,
        textAlign: "center"
    },

    //password styles
    requirementContainer: {
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    requirementText: {
        fontSize: 12,
        marginBottom: 4,
        fontFamily: 'System',
    },

    Passwordinput: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: "#fff",
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
    eyeIcon: {
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
});