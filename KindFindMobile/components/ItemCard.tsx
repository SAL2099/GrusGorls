//imports
import { View, Text, Image, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type Photo = {
  id: number;
  image_url: string;
  title: string;
  price: number;
  size: number;
  location: string;
  tags: string[];
  reserved_at?: string | null;
};

type Props = {
  item: Photo;
  onPress?: () => void;
  showReservedInfo?: boolean;
  searchQuery?: string;
  setSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
};

// ItemCard component displays individual item details in a card format, including image, title, price, size, location, and tags. It also allows for tag-based searching and can show reservation info
export default function ItemCard({
  item,
  onPress,
  showReservedInfo = false,
  searchQuery = "",
  setSearchQuery,
}: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: item.image_url }} style={styles.cardImage} />

      <Text style={styles.cardTitle}>{item.title}</Text>

      <View style={styles.tagRow}>
        {item.tags?.slice(0, 3).map((tag, index) => {
          const isActive = searchQuery.toLowerCase() === tag.toLowerCase();

          return (
            <Pressable
              key={index}
              style={[
                styles.tagChip,
                isActive && styles.tagChipActive,
              ]}
              onPress={() =>
                setSearchQuery?.((prev) =>
                  prev.toLowerCase() === tag.toLowerCase() ? "" : tag
                )
              }
            >
              <Text
                style={[
                  styles.tagChipText,
                  isActive && styles.tagChipTextActive,
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.cardPrice}>£{item.price.toFixed(2)}</Text>

      <Text style={styles.cardMeta} numberOfLines={1}>
        Size: {item.size}
      </Text>

      <Text style={styles.cardMeta} numberOfLines={1}>
        {item.location}
      </Text>

      {showReservedInfo && item.reserved_at && (
        <View style={styles.reservedRow}>
          <Ionicons name="time" size={14} color="#777" />
          <Text style={styles.reservedText}>
            {new Date(item.reserved_at).toLocaleString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  //card styles for the item card component
  card: {
    width: "48%",
    borderRadius: 12,
    backgroundColor: "#eef2e4",
    padding: 10,
    outlineColor: "rgba(197, 103, 103, 0.4)",
    outlineWidth: 1,
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

  // Styles for the reservation info row
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

  // Styles for the tag chips
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
