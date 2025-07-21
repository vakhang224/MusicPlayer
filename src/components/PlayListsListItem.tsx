import { Playlist } from "@/helpers/type"
import { defaultStyles } from "@/styles"
import React from "react"
import { Image, StyleSheet, Text, TouchableHighlight, TouchableHighlightProps, TouchableOpacity, View } from "react-native"
import { AntDesign } from '@expo/vector-icons'
import { colors } from "@/constants/token"

type PlaylistsListItemProps = {
    playlist: Playlist
} & TouchableHighlightProps

export const PlaylistsListItem = ({playlist, ...props}: PlaylistsListItemProps) => {
    return(
        <TouchableHighlight activeOpacity={0.8} {...props}>
            <View style={styles.playlistItemContainer}>
                <View>
                    <Image
                        source={{uri: playlist.artworkPreview}}
                        style={styles.playlistArtworkImage}
                    />
                </View>

                <View style={{  flexDirection: 'row', 
                                justifyContent:'space-between', 
                                alignItems:'center',
                                width: '100%' }}>
                    <Text numberOfLines={1} style={styles.playlistNameText}>{playlist.name}</Text>
                    <AntDesign name='right' size={16} color={colors.icon} style={{opacity: 0.5}}/>
                </View>
            </View>
        </TouchableHighlight>
    )
}

const styles = StyleSheet.create({
    playlistItemContainer: {
        flexDirection: 'row',
        columnGap: 14,
        alignItems: 'center',
        paddingRight: 90
    },
    playlistArtworkImage: {
        borderRadius: 8,
        width: 70,
        height: 70,
    },
    playlistNameText: {
        ...defaultStyles.text,
        fontSize: 17,
        fontWeight: '600',
        maxWidth:'80%',
    }
})