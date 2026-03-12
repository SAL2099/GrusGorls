import React, { useEffect, useState } from "react"; // React imports
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from "react-native"; // React Native components
import MapView, { Marker, Region } from "react-native-maps"; // Map components
import * as Location from "expo-location"; // Expo Location for getting user location
import Screen from "../components/Screen"; // Custom Screen component (probably adds padding and background)

const ABERDEEN_REGION: Region = { // Default region (centered on Aberdeen) if location permission is not granted
  latitude: 57.1497,
  longitude: -2.0943,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

//Distance helpers (km) to work out co-ordinates for the map and show distance to shops copied from https://stackoverflow.com/a/21623206/466693
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) { // Haversine formula to calculate distance between two lat/lng points
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

//Overpass fetch (tries multiple servers to reduce errors)
async function fetchOsmShops(lat: number, lng: number, radiusMeters: number) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
  ];

  // increase timeout a bit to reduce 504s
  const query = `
    [out:json][timeout:45];
    (
      nwr["shop"="charity"](around:${radiusMeters},${lat},${lng});
      nwr["shop"="second_hand"](around:${radiusMeters},${lat},${lng});
    );
    out tags center;
  `;

  let lastErr: any = null; // to keep track of the last error in case all endpoints fail

  for (const url of endpoints) { // try each endpoint in order
    try {
      const res = await fetch(url, {  // POST request to Overpass API
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) { // if response is not ok, save error and try next endpoint
        lastErr = new Error(`Overpass error: ${res.status}`);
        continue;
      }

      const data = await res.json(); // parse JSON response
      const elements = Array.isArray(data?.elements) ? data.elements : []; // ensure elements is an array

      return elements // returns the info we need about the shops
        .map((el: any) => { // extract lat/lng (nodes have lat/lon, ways/relations have center.lat/lon)
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

          const kind = tags.shop; // "charity" or "second_hand" overpass uses both

          return { // create a shop object with the relevant info
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
        .filter(Boolean); // filter out any nulls (e.g. from missing lat/lng)
    } catch (e) { // if fetch or parsing fails, save error and try next endpoint
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("Failed to load shops"); // if all endpoints fail, throw the last error encountered
}

export default function MapScreen() { // Main component for the Map tab
  // State variables
  const [region, setRegion] = useState<Region>(ABERDEEN_REGION);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(true);

  // Shop data states
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);

  // Radius state in KM
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [lastSuccessRadiusKm, setLastSuccessRadiusKm] = useState<number | null>(null);

  // Selected shop for details modal
  const [selectedShop, setSelectedShop] = useState<any>(null);

  //Get user location once
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

  //Fetch shops whenever location or radius changes
  useEffect(() => {
    if (!userCoords) return; // can only fetch if we have user coordinates

    const radiusMeters = radiusKm * 1000; // convert km to meters for the Overpass query

    (async () => { //added try/catch to reduce errors and keep showing shops if a fetch fails (common with Overpass)
      try {
        setLoadingShops(true);
        setShopsError(null);

        const results = await fetchOsmShops(userCoords.lat, userCoords.lng, radiusMeters);

        setShops(results);
        setLastSuccessRadiusKm(radiusKm); //remember which radius worked
      } catch (e: any) {
        //keep current shops on error (don’t wipe) so at least something is shown, but show error message and remember error
        setShopsError(e?.message ?? "Failed to load shops");
      } finally {
        setLoadingShops(false);
      }
    })();
  }, [userCoords, radiusKm]); //refetch shops whenever user coordinates or radius changes

  const shownRadius = lastSuccessRadiusKm ?? radiusKm; // show the last successfully loaded radius in the UI, even if the user has changed
  return (
    <Screen>
      <View style={styles.container}>
        {/*Radius selection and status messages */}
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
            /* Loading Overlay for GPS */
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

        {/* Details modal */}
        {/* Modal to show shop details when a marker is pressed */}
        <Modal
          visible={!!selectedShop}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedShop(null)}
        >
          <View style={styles.modalBackdrop}> 
            {/* Backdrop to dim the background and close modal when pressed */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedShop(null)}
            />

            {/* Modal card with shop details */}
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

// Styles for the MapScreen component
const styles = StyleSheet.create({

  // Main screen layout
  container: { flex: 1 },

  // Control Panel Top UI 
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

  // Radius Selection Pills 
  row: { 
    flexDirection: "row", 
    alignItems: "center", 
    flexWrap: "wrap", 
    gap: 8 
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999, // Makes the button fully rounded
    backgroundColor: "#CE6674"
  },

  pillSelected: { backgroundColor: "#f30678" }, // Highlight color for active radius
  pillText: { color: "#fff", fontWeight: "700" },
  valueText: { color: "#fff", marginLeft: 6, opacity: 0.9 },

  // feedback text for results, loading state, errors, and hints
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

  //Map and loading state
  mapWrap: { flex: 1, overflow: "hidden" },

  loading: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },

  loadingText: { marginTop: 8, color: "#fff" },

  //Shop detail module (Bottom Information card) 
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end", // Aligns modal to bottom of screen
    backgroundColor: "rgba(0,0,0,0.4)"  // Semi-transparent backdrop to dim the background and focus on the modal
  },

  modalCard: {
    backgroundColor: "#121C0C", // Dark background for the modal card
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18
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

  //Modal buttons 
  closeBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#CE6674",
    alignItems: "center"
  },

  closeBtnText: { color: "#fff", fontWeight: "800" },

  //User Location Marker 
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