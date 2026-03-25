export { default } from "../../Item/ItemDetails";

// import { useLocalSearchParams } from "expo-router";
// import { supabase } from "../../../lib/supabase";
// import { useEffect, useState } from "react";
// import { View, Text, Image, StyleSheet, ScrollView } from "react-native";

// export default function StoreItemDetails() {
//   const { id } = useLocalSearchParams();
//   const [item, setItem] = useState(null);

//   useEffect(() => {
//     async function loadItem() {
//       const { data } = await supabase
//         .from("photos")
//         .select("*")
//         .eq("id", Number(id))
//         .single();

//       setItem(data);
//     }

//     loadItem();
//   }, [id]);

//   if (!item) return null;

//   return (
//     <ScrollView style={styles.container}>
//       <Image source={{ uri: item.image_url }} style={styles.image} />

//       <Text style={styles.title}>{item.title}</Text>
//       <Text style={styles.price}>£{item.price}</Text>

//       <View style={styles.section}>
//         <Text style={styles.label}>Reservation Number</Text>
//         <Text style={styles.value}>{item.reservation_number}</Text>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.label}>Reserved At</Text>
//         <Text style={styles.value}>
//           {new Date(item.reserved_at).toLocaleString()}
//         </Text>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.label}>Reserved By</Text>
//         <Text style={styles.value}>{item.reserved_by}</Text>
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 16,
//     backgroundColor: "#fff",
//   },
//   image: {
//     width: "100%",
//     height: 320,
//     borderRadius: 16,
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "700",
//     marginBottom: 4,
//     color: "#111",
//   },
//   price: {
//     fontSize: 20,
//     fontWeight: "600",
//     marginBottom: 20,
//     color: "#333",
//   },
//   section: {
//     marginBottom: 20,
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#666",
//   },
//   value: {
//     fontSize: 16,
//     color: "#222",
//     marginTop: 4,
//   },
// });
