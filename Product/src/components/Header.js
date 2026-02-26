import { View, Text, StyleSheet } from 'react-native';

export default function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>KindFind</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  header: {
    height: 80,
    backgroundColor: '#93E265',
    justifyContent: 'center',
    alignItems: 'Center',
    paddingTop: 20,
  },
  title: {
    color: '#CE6674',
    fontSize: 24,
    fontWeight: '700',
  },
});