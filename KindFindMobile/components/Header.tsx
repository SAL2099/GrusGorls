import { StyleSheet, Text, View, Image } from 'react-native'; // Import necessary components from react-native

export default function Header() { // The Header component displays the app's logo and title at the top of the screen
  return ( 
    <View style={styles.header}> 
      <Image 
        source={require('../assets/images/KindFindWriting.png')} 
        style={styles.TextLogo}
      /> 
    </View> 
  ); 
}

// Define styles for the Header
const styles = StyleSheet.create({
  header: {
    height: 100,
    backgroundColor: '#121C0C',
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 20,
    paddingHorizontal: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(206, 102, 116, 0.4)'

  },

  title: {
    color: '#CE6674',
    fontSize: 24,
    fontWeight: '700',
  },

  TextLogo: {
    width: 200,
    height: 75,
    left: 15,  
    top: 5,                      
    borderRadius: 10,
  }
});