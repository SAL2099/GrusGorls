import React, { useEffect, useState } from "react";
import {View, Text, StyleSheet, ActivityIndicator, Image, FlatList, Pressable,} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function StoreProfileScreen() {
    const router = useRouter();
    const { profileId } = useLocalSearchParams<{
        profileId: string;
    }>();

    const [profile, setProfile] = useState<any>(null);
    const [shopUploads, setShopUploads] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!profileId) {
            setError("No store profile was selected.");
            setLoading(false);
            return;
        }

        loadStoreProfile();
    }, [profileId]);

    async function loadStoreProfile() {
        try {
            setLoading(true);
            setError(null);

            console.log("Loading store profile:", profileId);

            // Get the specific store selected from the map
            const {
                data: profileData,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", profileId)
                .eq("role", "store")
                .single();

            if (profileError || !profileData) {
                console.error(
                    "Store profile error:",
                    profileError
                );

                setProfile(null);
                setError(
                    profileError?.message ??
                        "Store profile not found."
                );

                return;
            }

            console.log(
                "STORE PROFILE FOUND:",
                profileData
            );

            setProfile(profileData);

            // Load store announcements
            const {
                data: announcementData,
                error: announcementError,
            } = await supabase
                .from("announcements")
                .select("*")
                .eq("store_id", profileData.id)
                .order("created_at", {
                    ascending: false,
                });

            if (announcementError) {
                console.error(
                    "Store announcements error:",
                    announcementError
                );

                setAnnouncements([]);
            } else {
                setAnnouncements(
                    announcementData ?? []
                );
            }

            // Load available store photos
            if (profileData.store_id) {
                const {
                    data: photoData,
                    error: photoError,
                } = await supabase
                    .from("photos")
                    .select("*")
                    .eq(
                        "store_id",
                        profileData.store_id
                    )
                    .is("collected_at", null)
                    .eq("reserved", false)
                    .order("created_at", {
                        ascending: false,
                    });

                if (photoError) {
                    console.error(
                        "Store photos error:",
                        photoError
                    );

                    setShopUploads([]);
                } else {
                    setShopUploads(photoData ?? []);
                }
            } else {
                setShopUploads([]);
            }
        } catch (e: any) {
            console.error("Unexpected error:", e);

            setError(
                e?.message ??
                    "Failed to load store profile."
            );
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Screen>
                <View style={styles.center}>
                    <ActivityIndicator
                        size="large"
                        color="#CE6674"
                    />

                    <Text style={styles.loadingText}>
                        Loading store profile...
                    </Text>
                </View>
            </Screen>
        );
    }

    if (error || !profile) {
        return (
            <Screen>
                <View style={styles.center}>
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>
                            ← Back
                        </Text>
                    </Pressable>
                </View>
            </Screen>
        );
    }

    return (
        <Screen>
            <FlatList
                data={[]}
                renderItem={() => null}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
                ListHeaderComponent={
                    <>
                        {/* BACK BUTTON */}

                        <Pressable
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.backButtonText}>
                                ← Back
                            </Text>
                        </Pressable>

                        {/* STORE INFORMATION */}

                        <View style={styles.card}>
                            <Text style={styles.accountType}>
                                Store
                            </Text>

                            <Text style={styles.title}>
                                {profile.store_name ??
                                    profile.display_name ??
                                    "Unnamed Store"}
                            </Text>

                            <View style={styles.infoSection}>
                                <Text style={styles.label}>
                                    Opening times
                                </Text>

                                <Text style={styles.text}>
                                    {profile.opening_times ??
                                        "Not provided"}
                                </Text>
                            </View>

                            <View style={styles.infoSection}>
                                <Text style={styles.label}>
                                    Address
                                </Text>

                                <Text style={styles.text}>
                                    {profile.address ??
                                        "Not provided"}
                                </Text>
                            </View>
                        </View>

                        {/* ANNOUNCEMENTS */}

                        <View style={styles.announcementCard}>
                            <View
                                style={styles.announcementHeader}
                            >
                                <View
                                    style={
                                        styles.announcementHeading
                                    }
                                >
                                    <Text
                                        style={
                                            styles.sectionTitle
                                        }
                                    >
                                        Announcements
                                    </Text>

                                    <Text style={styles.sub}>
                                        Latest updates from this store
                                    </Text>
                                </View>

                                <View
                                    style={styles.announcementIcon}
                                >
                                    <Ionicons
                                        name="megaphone-outline"
                                        size={20}
                                        color="#fff"
                                    />
                                </View>
                            </View>

                            {announcements.length === 0 ? (
                                <View
                                    style={
                                        styles.emptyAnnouncement
                                    }
                                >
                                    <Text style={styles.emptyText}>
                                        This store hasn't posted
                                        any announcements yet.
                                    </Text>
                                </View>
                            ) : (
                                announcements.map(
                                    (announcement) => (
                                        <View
                                            key={announcement.id}
                                            style={
                                                styles.publicAnnouncement
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.announcementTitle
                                                }
                                            >
                                                {
                                                    announcement.title
                                                }
                                            </Text>

                                            <Text
                                                style={
                                                    styles.announcementMessage
                                                }
                                            >
                                                {
                                                    announcement.message
                                                }
                                            </Text>

                                            {announcement.created_at && (
                                                <Text
                                                    style={
                                                        styles.announcementDate
                                                    }
                                                >
                                                    {new Date(
                                                        announcement.created_at
                                                    ).toLocaleDateString()}
                                                </Text>
                                            )}
                                        </View>
                                    )
                                )
                            )}
                        </View>

                        {/* STORE GALLERY */}

                        <View style={styles.galleryCard}>
                            <View style={styles.galleryHeader}>
                                <View>
                                    <Text
                                        style={
                                            styles.sectionTitle
                                        }
                                    >
                                        Store Gallery
                                    </Text>

                                    <Text style={styles.sub}>
                                        Items currently available
                                    </Text>
                                </View>

                                <Text style={styles.galleryCount}>
                                    {shopUploads.length} item
                                    {shopUploads.length === 1
                                        ? ""
                                        : "s"}
                                </Text>
                            </View>

                            {shopUploads.length === 0 ? (
                                <View style={styles.emptyGallery}>
                                    <Text style={styles.emptyText}>
                                        This store hasn't uploaded
                                        any items yet.
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.galleryGrid}>
                                    {shopUploads.map((item) => (
                                        <Pressable
                                            key={item.id.toString()}
                                            style={
                                                styles.imageWrapper
                                            }
                                            onPress={() => {
                                                router.push({
                                                    pathname:
                                                        "/listing/[id]",
                                                    params: {
                                                        id: item.id,
                                                        item: JSON.stringify(
                                                            item
                                                        ),
                                                    },
                                                });
                                            }}
                                        >
                                            <Image
                                                source={{
                                                    uri: item.image_url,
                                                }}
                                                style={styles.image}
                                            />
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </>
                }
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    // --------------------------------
    // GENERAL
    // --------------------------------

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    container: {
        padding: 16,
        paddingBottom: 30,
    },

    loadingText: {
        color: "#fff",
        marginTop: 10,
    },

    // --------------------------------
    // BACK BUTTON
    // --------------------------------

    backButton: {
        backgroundColor: "#CE6674",
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginTop: 18,
        marginBottom: 14,
        borderRadius: 12,
        alignSelf: "flex-start",

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },

    backButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "900",
    },

    // --------------------------------
    // STORE INFORMATION
    // --------------------------------

    card: {
        backgroundColor: "#121C0C",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
         outlineColor: "rgba(197, 103, 103, 0.4)",
        outlineWidth: 1,

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },

    accountType: {
        color: "#CE6674",
        fontSize: 13,
        fontWeight: "800",
        textTransform: "uppercase",
        marginBottom: 6,
    },

    title: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "900",
        marginBottom: 14,
    },

    infoSection: {
        marginTop: 10,
    },

    label: {
        color: "#fff",
        opacity: 0.6,
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 4,
    },

    text: {
        color: "#fff",
        fontSize: 15,
        opacity: 0.9,
    },

    // --------------------------------
    // SHARED TEXT
    // --------------------------------

    sectionTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "900",
    },

    sub: {
        color: "#fff",
        opacity: 0.6,
        fontSize: 12,
        marginTop: 4,
    },

    // --------------------------------
    // ANNOUNCEMENTS
    // --------------------------------

    announcementCard: {
        backgroundColor: "#121C0C",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        outlineColor: "rgba(197, 103, 103, 0.4)",
        outlineWidth: 1,

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },

    announcementHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },

    announcementHeading: {
        flex: 1,
    },

    announcementIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#CE6674",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 10,
    },

    publicAnnouncement: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
    },

    announcementTitle: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "900",
    },

    announcementMessage: {
        color: "#fff",
        opacity: 0.85,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 6,
    },

    announcementDate: {
        color: "#fff",
        opacity: 0.45,
        fontSize: 11,
        marginTop: 8,
    },

    emptyAnnouncement: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },

    // --------------------------------
    // GALLERY
    // --------------------------------

    galleryCard: {
        backgroundColor: "#121C0C",
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        outlineColor: "rgba(197, 103, 103, 0.4)",
        outlineWidth: 1,

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },

    galleryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },

    galleryCount: {
        color: "#fff",
        opacity: 0.6,
        fontSize: 12,
    },

    galleryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        gap: 8,
    },

    imageWrapper: {
        width: "31.5%",
        aspectRatio: 1,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.08)",
    },

    image: {
        width: "100%",
        height: "100%",
    },

    emptyGallery: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 20,
    },

    emptyText: {
        color: "#fff",
        opacity: 0.7,
        textAlign: "center",
    },
});