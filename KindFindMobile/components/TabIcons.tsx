import { Image } from 'react-native';

type Props = {
  focused: boolean;
  activeIcon: any;
  inactiveIcon: any;
};

export default function TabIcon({ focused, activeIcon, inactiveIcon }: Props) {
  return (
    <Image
      source={focused ? activeIcon : inactiveIcon}
      style={{ width: 24, height: 24 }}
    />
  );
}