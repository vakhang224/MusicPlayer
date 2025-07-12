import { colors, fontSize } from "@/constants/token"
import { defaultStyles } from "@/styles"
import { Text, View } from "react-native"

const ArtistsScreen = () => {
    return (
        <View style={defaultStyles.container}>
            <Text style={{ color: colors.text , fontSize: fontSize.lg, textAlign: "center", fontWeight:700, marginBottom:20, marginTop:50}}>Artists</Text>
        </View>
    )
}

export default ArtistsScreen