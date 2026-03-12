import { View } from 'react-native'; // Import the View component from react-native
import { ReactNode } from 'react'; // Import the ReactNode type for typing the children prop


// Applies the common background color and flex style to all screens.
export default function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#192710' }}>
      {children}
    </View>
  );
}