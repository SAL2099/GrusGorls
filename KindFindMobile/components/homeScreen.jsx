//Imports
import { useEffect, useState, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View, Text, Image, FlatList, ActivityIndicator, Dimensions, TextInput, StyleSheet, Pressable } from "react-native"; // Import UI components from React Native
import { supabase } from "../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ItemCard from './ItemCard';
import AdvertCard from "./Advertising";

// HomeScreen component that displays a feed of items fetched from the Supabase database, with support for searching, pull-to-refresh, and infinite scrolling
export default function HomeScreen() { 
  // State variables to manage the list of items, loading states, pagination, search query, and adverts
  const isFocused = useIsFocused();
  const [items, setItems] = useState([]); 

  const [loading, setLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false); 
  const [loadingMore, setLoadingMore] = useState(false); 
  const [page, setPage] = useState(0); 
  const [hasMore, setHasMore] = useState(true); 

  const PAGE_SIZE = 10; // Number of items to fetch per page for pagination

  const screenWidth = Dimensions.get("window").width; // Get the width of the device screen to calculate card sizes for a responsive layout
  const spacing = 10; // Spacing between cards in the grid layout
  const cardWidth = (screenWidth - spacing) / 2; // Calculate the width of each card in a 2-column grid layout, accounting for spacing

  // State for search query and adverts
  const [searchQuery, setSearchQuery] = useState("");
  const [adverts, setAdverts] = useState([]);

  // navigation for pressable items
  const router = useRouter();

  // Load the initial set of items + adverts when the component mounts
  useEffect(() => {
    if (isFocused) {
      loadInitial();
      loadAdverts();
    }
  }, [isFocused]);

  // Listens to the database If the item was reserved or collected, remove it from the list immediately 
  useEffect(() => {
    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for ALL changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'photos'
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            // If a row is deleted, remove it from the list by ID
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          }

          else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new;

            // Remove if it's now reserved/collected, otherwise update the data
            if (updatedItem.reserved === true || updatedItem.collected_at !== null) {
              setItems((prev) => prev.filter((item) => item.id !== updatedItem.id));
            } else {
              setItems((prev) =>
                prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
              );
            }
          }

          else if (payload.eventType === 'INSERT') {
            //If someone uploads a new item, put it at the top of the list
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

  // Function to load the initial set of items from the Supabase database
  async function loadInitial() {
    setLoading(true);

    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("reserved", false)
      .is("collected_at", null)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (!error) {
      setItems(data);
      setPage(1); // next page starts at 1 
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
  }

  // Function to load more items for infinite scrolling when the user reaches the end of the list
  async function loadMore() {
    if (loadingMore || loading || !hasMore) return;

    setLoadingMore(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("reserved", false)
      .is("collected_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) {
      setItems(prev => [...prev, ...data]);
      setPage(prev => prev + 1);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  // function to load adverts
  async function loadAdverts(){
    const {data, error } = await supabase
      .from("adverts")
      .select("*")
      .eq("active", true)
    
    if (!error) {
      setAdverts(data);
    }
  }

  // Function to refresh the list of items when the user performs a pull-to-refresh gesture
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("reserved", false)
      .is("collected_at", null)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (!error) {
      setItems(data);
      setPage(1);
      setHasMore(data.length === PAGE_SIZE);
    }

    setRefreshing(false);
  }, []);

  //Search
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

  // Function to render each item in the FlatList, displaying the image and its metadata in a card layout
  const renderItem = ({ item, index }) => (
    // making the items pressable so it can take to a new page
    <Pressable
      onPress={() => router.push({
        pathname: "/Item/ItemDetails",
        params: { item: JSON.stringify(item) }
      })}

      style={[
        styles.card,
        {
          width: cardWidth,
          marginRight: index % 2 === 0 ? spacing : 0,
        },
      ]}
    >
      <Image
        source={{ uri: item.image_url }}
        style={styles.cardImage}
        resizeMode="cover"
      />

      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.title}
      </Text>

      <View style={styles.tagRow}>
        {item.tags?.slice(0, 3).map((tag, index) => {
          const isActive = searchQuery.toLowerCase() === tag.toLowerCase();

          return (
            <Pressable
              key={index}
              style={[
                styles.tagChip,
                isActive && styles.tagChipActive
              ]}
              onPress={() =>
                setSearchQuery((prev) =>
                  prev.toLowerCase() === tag.toLowerCase() ? "" : tag
                )
              }
            >
              <Text
                style={[
                  styles.tagChipText,
                  isActive && styles.tagChipTextActive
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.cardPrice}>£{item.price}</Text>

      <Text style={styles.cardMeta} numberOfLines={1}>
        Size: {item.size}
      </Text>

      <Text style={styles.cardMeta} numberOfLines={1}>
        {item.location}
      </Text>
    </Pressable>
  );

  // If the initial data is still loading, show a loading indicator instead of the list
  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  // after how many posts should an advert appear
  const AD_INTERVAL = 6;

  const feedWithAds = filteredItems.flatMap((item, index) => {
    const arr = [item];

    if ((index + 1) % AD_INTERVAL === 0 && adverts.length > 0) {
      const advertIndex = Math.floor(index / AD_INTERVAL) % adverts.length;
      const advert = adverts[advertIndex];
      arr.push({ type: "advert", advert });
    }

    return arr;
  })

  // Render the FlatList of items, with support for pull-to-refresh and infinite scrolling
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
  //Search bar
  searchWrapper: {
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 15,
    elevation: 2,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchBar: {
    flex: 1,
    paddingVertical: 12,
    color: "#000",
  },

  //Polaroid photos 
  card: {
    backgroundColor: "#eef2e4",
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    elevation: 2,
  },

  cardImage: {
    width: "100%",
    height: 170,
    borderRadius: 10,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    color: "#111",
  },

  cardPrice: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  cardMeta: {
    marginTop: 4,
    color: "#777",
    fontSize: 12,
  },

  //tags 
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },

  tagChip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "#CE6674",
  },

  tagChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#CE6674",
  },

  tagChipActive: {
    backgroundColor: "#CE6674",
  },

  tagChipTextActive: {
    color: "#fff",
  },
});
