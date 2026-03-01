import { StyleSheet, Text, View } from 'react-native'; // Import StyleSheet, Text, and View components from react-native

export default function Header() { // Define and export the Header component
  return (
    <View style={styles.header}>
      <Text style={styles.title}>KindFind</Text>
    </View>
  );
}

const styles = StyleSheet.create({ // Create a StyleSheet for the Header component
  header: {
    height: 80,
    backgroundColor: '#121C0C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    color: '#CE6674',
    fontSize: 24,
    fontWeight: '700',
  },
});