import { View, Text, Image, StyleSheet, Pressable, Linking} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type Advert = {
  id: number;
  image_url: string;
  title: string;
  description: string;
  link_url?: string;
};

// advert display card
export default function AdvertCard({ advert }: { advert: Advert }) {
    if (!advert) return null;
    return (
        <Pressable
            style={styles.card}
            onPress={() => {
                if (advert.link_url) Linking.openURL(advert.link_url);
            }}
        >
            <Image
                source={{ uri: advert.image_url }}
                style={styles.cardImage}
                resizeMode="cover"
            />

            {advert.title && (
                <Text style={styles.cardTitle} numberOfLines={2}>
                    {advert.title}
                </Text>
            )}

            {advert.description && (
                <Text style={styles.cardMeta}>
                    {advert.description}
                </Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    borderRadius: 12,
    backgroundColor: "#eef2e4",
    padding: 10,
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
    cardMeta: {
    marginTop: 4,
    color: "#777",
    fontSize: 12,
  },
});
