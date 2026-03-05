import { StyleSheet, Text, View, Image } from 'react-native'; // Import necessary components from react-native

export default function Header() { // The Header component displays the app's logo and title at the top of the screen
  return ( 
    <View style={styles.header}> 
      <Image 
        source={require('../assets/images/Logo2.jpg')}  //Replace with Logo2 or Logo3 if you want to test those
        style={styles.image} 
      /> 
      <Text style={styles.title}>KindFind</Text> 
    </View> 
  ); 
}

// Define styles for the Header component using StyleSheet
const styles = StyleSheet.create({
  header: {
    height: 125,
    backgroundColor: '#121C0C',
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  image: {
    width: 60,
    height: 60,
    position: 'absolute', // Pulls image out of the layout flow
    left: 15,            
    top: 40,             
    borderRadius: 10,
  },
  title: {
    color: '#CE6674',
    fontSize: 24,
    fontWeight: '700',
  },
});