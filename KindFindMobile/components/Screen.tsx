import { View } from 'react-native';
import { ReactNode } from 'react';

export default function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#192710' }}>
      {children}
    </View>
  );
}