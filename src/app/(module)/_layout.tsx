// app/(module)/_layout.tsx
import { Stack } from "expo-router";
import { colors } from "@/constants/token";

export default function ModuleLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
        },
      }}
    >
      {/* Ẩn header cho 'profile' vì nó có header tùy chỉnh */}
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
        }}
      />

      {/* Ẩn header cho 'settings' vì nó có header tùy chỉnh */}
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />

      {/* Giữ lại header cho 'ForgotPassword' */}
      <Stack.Screen
        name="ForgotPasswordModule"
        options={{
          headerTitle: "Reset Password",
        }}
      />

      {/* Giữ lại header cho 'addToPlaylist' */}
      <Stack.Screen
        name="addToPlaylist"
        options={{
          headerTitle: "Add to Playlist",
        }}
      />
    </Stack>
  );
}