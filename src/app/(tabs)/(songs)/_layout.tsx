import { defaultStyles } from "@/styles"
import { Stack } from "expo-router"
import { View } from "react-native"

const SongsScreenLayout = () => {
    return (
        <View style={defaultStyles.container}>
            <Stack>
                <Stack.Screen name="index" 
                options={{
                    
                    headerTitle: 'Songs',
                    headerShown:false,
                }}/>
            </Stack>
        </View>
    )
}

export default SongsScreenLayout