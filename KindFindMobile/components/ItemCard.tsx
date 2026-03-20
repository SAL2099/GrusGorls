import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type Photo = {
  id: number;
  image_url: string;
  title: string;
  price: number;
  tags: string[];
  reserved_at?: string | null;
};

type Props = {
  item: Photo;
  onPress?: () => void;
  showReservedInfo?: boolean;
};

export default function ItemCard({ item, onPress, showReservedInfo = false }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: item.image_url }} style={styles.cardImage} />

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardPrice}>£{item.price}</Text>

      {showReservedInfo && item.reserved_at && (
        <View style={styles.reservedRow}>
          <Ionicons name="time" size={14} color="#777" />
          <Text style={styles.reservedText}>
            {new Date(item.reserved_at).toLocaleString()}
          </Text>
        </View>
      )}

      <View style={styles.tagRow}>
        {item.tags?.map((tag, index) => (
          <View key={index} style={styles.tagChip}>
            <Text style={styles.tagChipText}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    marginHorizontal: 6,
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
  reservedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  reservedText: {
    fontSize: 12,
    color: "#777",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },
  tagChip: {
    backgroundColor: "#fff",
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
});
