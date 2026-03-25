import { Stack } from "expo-router";

export default function StoreRootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="tabs" />
            <Stack.Screen name="item/[id]" />
        </Stack>
    );
}