//Imports
import { useEffect, useState, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View, Text, Image, FlatList, ActivityIndicator, Dimensions, TextInput, StyleSheet, Pressable } from "react-native"; 
import { supabase } from "../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { fetchOsmShops } from "../lib/osmService";
import ItemCard from './ItemCard';
import AdvertCard from "./Advertising";

// HomeScreen component that displays a feed of items fetched from the Supabase database, with support for searching, pull-to-refresh, and infinite scrolling
export default function HomeScreen() { 
  // State variables to manage the list of items, loading states, pagination, search query, adverts, and shop profiles
  const isFocused = useIsFocused();
  const [items, setItems] = useState([]); 

  const [loading, setLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false); 
  const [loadingMore, setLoadingMore] = useState(false); 
  const [page, setPage] = useState(0); 
  const [hasMore, setHasMore] = useState(true); 

  const PAGE_SIZE = 10; 

  const screenWidth = Dimensions.get("window").width; 
  const spacing = 10; 
  const cardWidth = (screenWidth - spacing) / 2; 

  // State for search query, adverts, and searched shop profiles
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedShops, setSearchedShops] = useState([]);
  const [adverts, setAdverts] = useState([]);

  // State for "posts near me" filtering — nearbyStoreIds is null until we know the
  // user's location (or if location isn't available); once loaded it holds the
  // OSM shop ids (same ids saved as photos.store_id at upload time) within range.
  const [nearbyStoreIds, setNearbyStoreIds] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locatingShops, setLocatingShops] = useState(false);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const NEARBY_RADIUS_METERS = 8000; // ~5 miles

  // navigation for pressable items
  const router = useRouter();

  // Work out which charity/second-hand shops are near the browsing user — only runs
  // once, the first time the "near me" toggle is switched on, since it's a bit slow.
  // Reuses the same OSM lookup as Upload/Map, so the ids line up with photos.store_id.
  useEffect(() => {
    if (!showNearbyOnly || nearbyStoreIds !== null || locatingShops) return;

    (async () => {
      try {
        setLocatingShops(true);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationDenied(true);
          setNearbyStoreIds(null); // fail open — no location, so don't filter
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const results = await fetchOsmShops(
          loc.coords.latitude,
          loc.coords.longitude,
          NEARBY_RADIUS_METERS
        );

        setNearbyStoreIds(results.map((s) => s.id));
      } catch (e) {
        console.log("Failed to determine nearby shops:", e);
        setNearbyStoreIds(null); // fail open — show everything if we couldn't figure out the area
      } finally {
        setLocatingShops(false);
      }
    })();
  }, [showNearbyOnly]);

  // Applies the "near me" filter to a photos query. Items with no store_id (dropped
  // off to "Other", not tied to a registered shop) always pass through since we have
  // no location to check them against.
  function applyAreaFilter(query) {
    if (!showNearbyOnly) return query;
    if (nearbyStoreIds === null) return query; // location unknown/denied — fail open

    if (nearbyStoreIds.length === 0) {
      // No charity/second-hand shops found nearby — only show unassigned drop-offs
      return query.is("store_id", null);
    }

    const idList = nearbyStoreIds.map((id) => `"${id}"`).join(",");
    return query.or(`store_id.is.null,store_id.in.(${idList})`);
  }

  // Load initial items & adverts — only waits on the area lookup when "near me" is on,
  // so the default (show everything) feed loads immediately without waiting on location.
  useEffect(() => {
    if (isFocused && !(showNearbyOnly && locatingShops)) {
      loadInitial();
    }
  }, [isFocused, locatingShops, nearbyStoreIds, showNearbyOnly]);

  useEffect(() => {
    if (isFocused) {
      loadAdverts();
    }
  }, [isFocused]);

  // Search profile shops dynamically as searchQuery updates
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query.length === 0) {
      setSearchedShops([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, store_name, display_name, role, location")
        .eq("role", "store");

      if (!error && data) {
        const matches = data.filter((shop) => {
          const storeName = (shop.store_name || "").toLowerCase();
          const displayName = (shop.display_name || "").toLowerCase();
          return storeName.includes(query) || displayName.includes(query);
        });

        setSearchedShops(matches);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Realtime updates listener
  useEffect(() => {
    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', schema: 'public', table: 'photos'
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new;
            if (updatedItem.reserved === true || updatedItem.collected_at !== null) {
              setItems((prev) => prev.filter((item) => item.id !== updatedItem.id));
            } else {
              setItems((prev) =>
                prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
              );
            }
          } else if (payload.eventType === 'INSERT') {
            if (!payload.new.reserved && !payload.new.collected_at) {
              setItems((prev) => [payload.new, ...prev]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function cleanupOldUnregisteredItems() {
    const { data, error } = await supabase
      .from("photos")
      .select("id, created_at")
      .is("store_id", null);

    if (error || !data) return;

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const expired = data.filter(item => {
      return now - new Date(item.created_at).getTime() >= weekMs;
    });

    for (const item of expired) {
      await supabase.from("photos").delete().eq("id", item.id);
    }
  }

  async function loadInitial() {
    setLoading(true);
    await cleanupOldUnregisteredItems();

    let query = supabase
      .from("photos")
      .select("*")
      .eq("reserved", false)
      .is("collected_at", null);

    query = applyAreaFilter(query);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (!error) {
      setItems(data);
      setPage(1); 
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
  }

  async function loadMore() {
    if (loadingMore || loading || !hasMore) return;

    setLoadingMore(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("photos")
      .select("*")
      .eq("reserved", false)
      .is("collected_at", null);

    query = applyAreaFilter(query);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) {
      setItems(prev => [...prev, ...data]);
      setPage(prev => prev + 1);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  async function loadAdverts(){
    const {data, error } = await supabase
      .from("adverts")
      .select("*")
      .eq("active", true);
    
    if (!error) {
      setAdverts(data);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    let query = supabase
      .from("photos")
      .select("*")
      .eq("reserved", false)
      .is("collected_at", null);

    query = applyAreaFilter(query);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (!error) {
      setItems(data);
      setPage(1);
      setHasMore(data.length === PAGE_SIZE);
    }

    setRefreshing(false);
  }, [nearbyStoreIds, showNearbyOnly]);

  // Filter items locally
  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return true;

    const title = String(item.title ?? "").toLowerCase();
    const size = String(item.size ?? "").toLowerCase();
    const location = String(item.location ?? "").toLowerCase();
    const tags = Array.isArray(item.tags)
      ? item.tags.join(" ").toLowerCase()
      : String(item.tags ?? "").toLowerCase();

    return (
      title.includes(query) ||
      size.includes(query) ||
      location.includes(query) ||
      tags.includes(query)
    );
  });

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  const AD_INTERVAL = 6;

  const feedWithAds = filteredItems.flatMap((item, index) => {
    const arr = [item];

    if ((index + 1) % AD_INTERVAL === 0 && adverts.length > 0) {
      const advertIndex = Math.floor(index / AD_INTERVAL) % adverts.length;
      const advert = adverts[advertIndex];
      arr.push({ type: "advert", advert });
    }

    return arr;
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchBar}
          placeholder="Search by title, tag, size, or location"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* "Near me" area filter toggle */}
      <View style={styles.areaRow}>
        {(() => {
          const isLoadingState = showNearbyOnly && locatingShops;
          return (
            <Pressable
              style={[styles.areaPill, !isLoadingState && styles.areaPillActive]}
              onPress={() => setShowNearbyOnly((prev) => !prev)}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={isLoadingState ? "#CE6674" : "#fff"}
              />
              <Text style={[styles.areaPillText, !isLoadingState && styles.areaPillTextActive]}>
                {showNearbyOnly
                  ? locatingShops
                    ? "Finding stores near you…"
                    : "Stores near you"
                  : "All stores"}
              </Text>
            </Pressable>
          );
        })()}

        {showNearbyOnly && locationDenied && (
          <Text style={styles.areaHint}>Enable location access to filter by area</Text>
        )}
      </View>

      {/* Render matching shop profiles when searching */}
      {searchedShops.length > 0 && (
        <View style={styles.shopContainer}>
          <Text style={styles.shopHeaderTitle}>Charity Shops</Text>
          <FlatList
            horizontal
            data={searchedShops}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shopList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.shopCard}
                onPress={() =>
                  router.push({
                    pathname: "/Profile/StoreProfile",
                    params: { store: JSON.stringify(item) }
                  })
                }
              >
                <Ionicons name="storefront-outline" size={18} color="#CE6674" />
                <Text style={styles.shopName}>
                  {item.store_name || item.display_name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <FlatList
        data={feedWithAds}
        keyExtractor={(item, index) => 
          item.type === "advert"
          ? `advert-${index}`
          : item.id.toString()
        }
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ rowGap: 16 }}
        renderItem={({ item }) => {
          if (item.type === "advert"){
            return <AdvertCard advert={item.advert} />;
          }
          return (
            <ItemCard
              item={item}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onPress={() =>
                router.push({
                  pathname: "/Item/ItemDetails",
                  params: { item: JSON.stringify(item) }
                })
              }
            />
          );
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 20 }} />
          ) : !hasMore ? (
            <Text style={{ textAlign: "center", marginVertical: 20, color: "#888" }}>
              No more posts
            </Text>
          ) : null
        }
      />  
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  //Search bar
  searchWrapper: {
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    elevation: 2,
    marginTop: 10,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchBar: {
    flex: 1,
    paddingVertical: 12,
    color: "#000",
  },

  // "Near me" area filter toggle
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  areaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#CE6674",
  },

  areaPillActive: {
    backgroundColor: "#CE6674",
  },

  areaPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CE6674",
  },

  areaPillTextActive: {
    color: "#fff",
  },

  areaHint: {
    fontSize: 11,
    color: "#fff",
    opacity: 0.7,
  },

  // Charity Shop Profile Search Results
  shopContainer: {
    marginBottom: 12,
  },

  shopHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },

  shopList: {
    gap: 8,
  },

  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    elevation: 1,
  },

  shopName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
});