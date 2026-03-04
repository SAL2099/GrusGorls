import { useEffect, useState, useCallback } from "react";
import { View, Text, Image, FlatList, ActivityIndicator, Dimensions } from "react-native";
import { supabase } from "../lib/supabase"; // adjust path if needed

export default function HomeScreen() {
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

  useEffect(() => { 
    loadInitial(); 
    }, []); 
    
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

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

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
