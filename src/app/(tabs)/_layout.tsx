import FloatingPlayer from "@/components/FloatingPlayer";
import { colors, fontSize } from "@/constants/token";
import {
  FontAwesome,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from 'react-i18next';

const TabsNavigation = () => {
  const router = useRouter();
  const { t } = useTranslation();

  // const ProfileButton = () => (
  //   <TouchableOpacity
  //     onPress={() => router.push("/profile")}
  //     style={styles.profileButton}
  //     activeOpacity={0.7}
  //   >
  //     <FontAwesome6 name="user-circle" size={28} color="#05fae5" />
  //   </TouchableOpacity>
  // );

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarLabelStyle: {
            fontSize: fontSize.xs,
            fontWeight: "500",
          },
          headerShown:false,          // Bật header
          headerTitle: "",            // Không hiển thị text title
          tabBarStyle: {
            position: "absolute",
            borderRadius: 40,
            height: 70,
            borderTopWidth: 0,
            paddingTop: 8,
            marginBottom: 20,
            paddingLeft: 5,
            backgroundColor: "transparent",
          },
          tabBarBackground: () => (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: "#1C1C1E",
                  borderRadius: 40,
                  marginHorizontal: 5,
                  opacity: 0.95,
                },
              ]}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="favorites"
          options={{
            title: t('tabs.favorites'),
            // headerRight: () => <ProfileButton />,  // Gắn nút profile
            tabBarIcon: ({ color }: { color: string }) => (
              <FontAwesome name="heart" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: t('tabs.playlists'),
            // headerRight: () => <ProfileButton />,
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialCommunityIcons name="playlist-play" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="(songs)"
          options={{
            title: t('tabs.songs'),
            // headerRight: () => <ProfileButton />,
            tabBarIcon: ({ color }: { color: string }) => (
              <Ionicons name="musical-notes-sharp" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="artists"
          options={{
            title: t('tabs.artists'),
            // headerRight: () => <ProfileButton />,
            tabBarIcon: ({ color }: { color: string }) => (
              <FontAwesome6 name="users-line" size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      <FloatingPlayer
        style={{
          position: "absolute",
          left: 8,
          right: 8,
          bottom: 78,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  profileButton: {
    marginRight: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 25,
    padding: 6,
  },
});

export default TabsNavigation;
