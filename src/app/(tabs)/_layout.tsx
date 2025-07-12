import { FloatingPlayer } from "@/components/FloatingPlayer"
import { colors, fontSize } from "@/constants/token"
import { FontAwesome, FontAwesome6, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { Tabs } from "expo-router"
import { StyleSheet, View } from "react-native"

const TabsNavigation = () => {
    return (
        <>
            <Tabs screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarLabelStyle: {
                    fontSize: fontSize.xs,
                    fontWeight: '500',
                },
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    borderRadius: 40,
                    height: 70,
                    borderTopWidth: 0,
                    paddingTop: 8,
                    marginBottom: 20,
                    paddingLeft: 5,
                    backgroundColor: 'transparent'
                },
                tabBarBackground: () => (
                    <View
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: '#1C1C1E',
                            borderRadius: 40,
                            marginHorizontal: 5,
                            opacity: 0.95,
                        }}
                    />
                )

            }}>
                <Tabs.Screen name="favorites"
                    options={{
                        title: "Favorites",
                        tabBarIcon: ({ color }: { color: any }) =>
                            <FontAwesome name='heart' size={20} color={color} />
                    }} />
                <Tabs.Screen name="playlists"
                    options={{
                        title: "Playlists",
                        tabBarIcon: ({ color }: { color: any }) =>
                            <MaterialCommunityIcons name='playlist-play' size={28} color={color} />
                    }} />
                <Tabs.Screen name="(songs)"
                    options={{
                        title: "Songs",
                        tabBarIcon: ({ color }: { color: any }) =>
                            <Ionicons name='musical-notes-sharp' size={24} color={color} />
                    }} />
                <Tabs.Screen name="artists"
                    options={{
                        title: "Artists",
                        tabBarIcon: ({ color }: { color: any }) => <FontAwesome6 name='users-line' size={24} color={color} />
                    }} />
            </Tabs>

            <FloatingPlayer style={{
                position: 'absolute',
                left: 8,
                right: 8,
                bottom: 78,
            }}/>
        </>
    )

}

export default TabsNavigation