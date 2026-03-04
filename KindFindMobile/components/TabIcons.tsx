import { Image } from 'react-native'; // Import the Image component from react-native

type Props = { // Define the props for the TabIcon component
  focused: boolean;
  activeIcon: any;
  inactiveIcon: any;
};

export default function TabIcon({ focused, activeIcon, inactiveIcon }: Props) { // The TabIcon component takes in the focused state and the active/inactive icons as props
  return (
    <Image
      source={focused ? activeIcon : inactiveIcon}
      style={{ width: 24, height: 24 }}
    />
  );
}