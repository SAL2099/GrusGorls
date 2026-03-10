import { Image } from 'react-native'; // Import the Image component from react-native

// Define the props for the TabIcon component
type Props = { 
  focused: boolean;
  activeIcon: any;
  inactiveIcon: any;
};

// The TabIcon component takes in the focused state and the active/inactive icons as props
export default function TabIcon({ focused, activeIcon, inactiveIcon }: Props) {
  return (
    <Image
      source={focused ? activeIcon : inactiveIcon}
      style={{ width: 24, height: 24 }}
    />
  );
}