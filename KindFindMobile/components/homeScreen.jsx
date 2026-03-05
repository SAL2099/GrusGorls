import { useEffect, useState, useCallback } from "react"; // Import necessary hooks from React
import { View, Text, Image, FlatList, ActivityIndicator, Dimensions } from "react-native"; // Import UI components from React Native
import { supabase } from "../lib/supabase"; // adjust path if needed

export default function HomeScreen() { // Main component for the home screen that displays a feed of uploaded items
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

  // Load the initial set of items when the component mounts
  useEffect(() => {  
    loadInitial(); 
    }, []); 
    
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

  // Function to render each item in the FlatList, displaying the image and its metadata in a card layout
  const renderItem = ({ item, index }) => (
    <View 
        style={{ 
            width: cardWidth,
            marginBottom: 20, 
            marginRight: index % 2 === 0 ? spacing : 0,
            backgroundColor: "#fff", 
            padding: 10, 
            borderRadius: 10,
            elevation: 2, 
        }}>
      <Image
        source={{ uri: item.image_url }}
        style={{ width: "100%", height: 150, borderRadius: 10 }}
        resizeMode="cover"
      />
      <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 10 }}>{item.title}</Text>
      <Text style={{ marginTop: 5, color: "#555" }}>{item.description}</Text>
      <Text style={{ marginTop: 5, color: "#555" }}>Size : {item.size}</Text>
      <Text style={{ marginTop: 5, color: "#555" }}>{item.location}</Text>
      <Text style={{ marginTop: 5, color: "#555" }}>£{item.price}</Text>
      <Text style={{ marginTop: 5, fontSize: 12, color: "#888" }}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  );

  // If the initial data is still loading, show a loading indicator instead of the list
  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  // Render the FlatList of items, with support for pull-to-refresh and infinite scrolling
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      numColumns={2}
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
  );
}
