import { defaultStyles } from "@/styles"
import { Stack } from "expo-router"
import { View } from "react-native"

const ArtistsScreenLayout = () => {
    return (
        <View style={defaultStyles.container}>
            <Stack>
                <Stack.Screen name="index" 
                options={{

                    headerTitle: 'Artists',
                    headerShown:false
                }}/>
            </Stack>
        </View>
    )
}

export default ArtistsScreenLayout