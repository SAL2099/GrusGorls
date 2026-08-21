import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import Screen from "../../components/Screen";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const ABERDEEN_REGION: Region = {
  latitude: 57.1497,
  longitude: -2.0943,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = deg2rad(bLat - aLat);
  const dLng = deg2rad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(aLat)) *
    Math.cos(deg2rad(bLat)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

async function fetchOsmShops(lat: number, lng: number, radiusMeters: number) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
  ];

  const query = `
    [out:json][timeout:45];
    (
      nwr["shop"="charity"](around:${radiusMeters},${lat},${lng});
      nwr["shop"="second_hand"](around:${radiusMeters},${lat},${lng});
    );
    out tags center;
  `;

  let lastErr: any = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) {
        lastErr = new Error(`Overpass error: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const elements = Array.isArray(data?.elements) ? data.elements : [];

      return elements
        .map((el: any) => {
          const latOut = el.lat ?? el.center?.lat;
          const lngOut = el.lon ?? el.center?.lon;
          if (typeof latOut !== "number" || typeof lngOut !== "number") return null;

          const tags = el.tags ?? {};
          const name = tags.name ?? "Unnamed shop";
          const openingTimes = tags.opening_hours;

          const addressParts = [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:city"],
            tags["addr:postcode"],
          ].filter(Boolean);
          const address = addressParts.length ? addressParts.join(" ") : undefined;

          const kind = tags.shop;

          return {
            id: `${el.type}-${el.id}`,
            name,
            kind,
            label: kind === "charity" ? "Charity shop" : "Second-hand shop",
            lat: latOut,
            lng: lngOut,
            openingTimes,
            address,
          };
        })
        .filter(Boolean);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("Failed to load shops");
}

export default function MapScreen() {
  const router = useRouter();

  const [region, setRegion] = useState<Region>(ABERDEEN_REGION);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(true);

  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);

  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [lastSuccessRadiusKm, setLastSuccessRadiusKm] = useState<number | null>(null);

  // Selected shop for modal + matching registered profile state
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [registeredProfile, setRegisteredProfile] = useState<any>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Get user location once
  useEffect(() => {
    (async () => {
      try {
        setLoadingLoc(true);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({});
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        setUserCoords({ lat, lng });
        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        });
      } finally {
        setLoadingLoc(false);
      }
    })();
  }, []);

  // Fetch shops whenever location or radius changes
  useEffect(() => {
    if (!userCoords) return;

    const radiusMeters = radiusKm * 1000;

    (async () => {
      try {
        setLoadingShops(true);
        setShopsError(null);

        const results = await fetchOsmShops(userCoords.lat, userCoords.lng, radiusMeters);

        setShops(results);
        setLastSuccessRadiusKm(radiusKm);
      } catch (e: any) {
        setShopsError(e?.message ?? "Failed to load shops");
      } finally {
        setLoadingShops(false);
      }
    })();
  }, [userCoords, radiusKm]);

  // Check Supabase if the pressed map pin corresponds to a registered store account
  useEffect(() => {
    if (!selectedShop) {
      setRegisteredProfile(null);
      return;
    }

    (async () => {
      setCheckingProfile(true);
      const cleanName = selectedShop.name.trim();

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "store")
        .or(`store_name.ilike.%${cleanName}%,display_name.ilike.%${cleanName}%`)
        .limit(1);

      if (data && data.length > 0) {
        setRegisteredProfile(data[0]);
      } else {
        setRegisteredProfile(null);
      }
      setCheckingProfile(false);
    })();
  }, [selectedShop]);

  const shownRadius = lastSuccessRadiusKm ?? radiusKm;

  return (
    <Screen>
      <View style={styles.container}>
        {/* Radius selection controls */}
        <View style={styles.controls}>
          <Text style={styles.controlsTitle}>Radius</Text>

          <View style={styles.row}>
            {[1, 3, 5].map((r) => (
              <Pressable
                key={r}
                style={[styles.pill, radiusKm === r && styles.pillSelected]}
                onPress={() => setRadiusKm(r)}
              >
                <Text style={styles.pillText}>{r}km</Text>
              </Pressable>
            ))}
            <Text style={styles.valueText}>{radiusKm}km</Text>
          </View>

          <Text style={styles.resultsText}>
            Showing {shops.length} place{shops.length === 1 ? "" : "s"}
            {userCoords ? ` within ${shownRadius}km` : ""}
          </Text>

          {loadingShops ? <Text style={styles.hintText}>Loading shops…</Text> : null}

          {shopsError ? (
            <Text style={styles.hintText}>
              Server busy (Overpass). Showing last loaded results.
            </Text>
          ) : null}

          {!loadingShops && !shopsError && shops.length === 0 && userCoords ? (
            <Text style={styles.hintText}>
              No charity or second-hand shops found within {radiusKm}km. Try a further distance.
            </Text>
          ) : null}

          {!userCoords && !loadingLoc ? (
            <Text style={styles.hintText}>
              Location permission not granted — cannot fetch nearby shops.
            </Text>
          ) : null}
        </View>

        {/* Map */}
        <View style={styles.mapWrap}>
          {loadingLoc ? (
            <View style={styles.loading}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Getting location…</Text>
            </View>
          ) : (
            <MapView
              style={StyleSheet.absoluteFill}
              region={region}
              onRegionChangeComplete={setRegion}
            >
              {/* User marker */}
              {userCoords && (
                <Marker coordinate={{ latitude: userCoords.lat, longitude: userCoords.lng }}>
                  <View style={styles.userMarker}>
                    <View style={styles.userDot} />
                  </View>
                </Marker>
              )}

              {/* Shop markers */}
              {shops.map((shop: any) => (
                <Marker
                  key={shop.id}
                  coordinate={{ latitude: shop.lat, longitude: shop.lng }}
                  title={shop.name}
                  description={shop.label ?? ""}
                  onPress={() => setSelectedShop(shop)}
                />
              ))}
            </MapView>
          )}
        </View>

        {/* Details Modal */}
        <Modal
          visible={!!selectedShop}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedShop(null)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedShop(null)}
            />

            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{selectedShop?.name}</Text>

              {selectedShop?.label ? (
                <Text style={styles.modalSub}>{selectedShop.label}</Text>
              ) : null}

              {selectedShop?.openingTimes ? (
                <Text style={styles.modalSub}>Opening times: {selectedShop.openingTimes}</Text>
              ) : null}

              {selectedShop?.address ? (
                <Text style={styles.modalSub}>Address: {selectedShop.address}</Text>
              ) : null}

              {userCoords && selectedShop ? (
                <Text style={styles.modalSub}>
                  Distance:{" "}
                  {distanceKm(userCoords.lat, userCoords.lng, selectedShop.lat, selectedShop.lng).toFixed(2)} km
                </Text>
              ) : null}

              {/* Profile Navigation or Status */}
              {checkingProfile ? (
                <ActivityIndicator style={{ marginTop: 12 }} color="#CE6674" />
              ) : registeredProfile ? (
                <Pressable
                  style={styles.profileBtn}
                  onPress={() => {
                    setSelectedShop(null);

                    router.push({
                      pathname: "/store-profile",
                      params: {
                        profileId: registeredProfile.id,
                      },
                    });
                  }}
                >
                  <Text style={styles.profileBtnText}>View Shop Profile</Text>
                </Pressable>

              ) : (
                <Text style={styles.unregisteredText}>Unregistered Charity Shop</Text>
              )}

              {/* Close button */}
              <Pressable style={styles.closeBtn} onPress={() => setSelectedShop(null)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, },

  controls: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10
  },

  controlsTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#CE6674"
  },

  pillSelected: { backgroundColor: "#f30678" },
  pillText: { color: "#fff", fontWeight: "700" },
  valueText: { color: "#fff", marginLeft: 6, opacity: 0.9 },

  resultsText: {
    color: "#fff",
    opacity: 0.85,
    marginTop: 8
  },

  hintText: {
    color: "#fff",
    opacity: 0.7,
    marginTop: 6,
    fontSize: 12
  },

  mapWrap: { flex: 1, overflow: "hidden" },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  loadingText: { marginTop: 8, color: "#fff" },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)"
  },

  modalCard: {
    backgroundColor: "#121C0C",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800"
  },

  modalSub: {
    color: "#fff",
    opacity: 0.85,
    marginTop: 6
  },

  profileBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
    alignItems: "center"
  },

  profileBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15
  },

  unregisteredText: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 10,
    fontStyle: "italic"
  },

  closeBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#CE6674",
    alignItems: "center"
  },

  closeBtnText: { color: "#fff", fontWeight: "800" },

  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(59,130,246,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  userDot: {
    width: 17,
    height: 17,
    borderRadius: 10,
    backgroundColor: "#3B82F6"
  },
});