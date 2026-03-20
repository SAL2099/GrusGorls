import { useEffect, useState, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View, Text, Image, FlatList, ActivityIndicator, Dimensions, TextInput, StyleSheet, Pressable } from "react-native"; // Import UI components from React Native
import { supabase } from "../lib/supabase";
import { Ionicons } from "@expo/vector-icons"; //Icon
import { useRouter } from "expo-router";

export default function HomeScreen() { // Main component for the home screen that displays a feed of uploaded items
  const isFocused = useIsFocused();
  const [items, setItems] = useState([]); // State to hold the list of items fetched from the database
  const [loading, setLoading] = useState(true); // State to indicate whether the initial data is still loading
  const [refreshing, setRefreshing] = useState(false); // State to indicate whether the list is being refreshed (pull-to-refresh)
  const [loadingMore, setLoadingMore] = useState(false); // State to indicate whether more items are being loaded (infinite scroll)
  const [page, setPage] = useState(0); // State to keep track of the current page for pagination
  const [hasMore, setHasMore] = useState(true); // State to indicate whether there are more items to load (used for infinite scroll)

  const PAGE_SIZE = 10; // Number of items to fetch per page for pagination

  const screenWidth = Dimensions.get("window").width; // Get the width of the device screen to calculate card sizes for a responsive layout
  const spacing = 10; // Spacing between cards in the grid layout
  const cardWidth = (screenWidth - spacing) / 2; // Calculate the width of each card in a 2-column grid layout, accounting for spacing

  //search bar
  const [searchQuery, setSearchQuery] = useState("");

  // navigation for pressable items
  const router = useRouter();

  // Load the initial set of items when the component mounts
  useEffect(() => {
    if (isFocused) {
      loadInitial();
    }
  }, [isFocused]);

  // Function to load the initial set of items from the Supabase database
  async function loadInitial() {
    setLoading(true);

    const { data, error } = await supabase
      .from("photos")
      .select("*")
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
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) {
      setItems(prev => [...prev, ...data]);
      setPage(prev => prev + 1);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    const { data, error } = await supabase
      .from("photos")
      .select("*")
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
        pathname: "/ItemDetails",
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
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 20 }}
        columnWrapperStyle={{}}
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
    marginBottom: 12,
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
