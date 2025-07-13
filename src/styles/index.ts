import { colors, fontSize } from '@/constants/token'
import { StyleSheet } from 'react-native'

export const defaultStyles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor: colors.background,
    },
    text:{
        fontSize: fontSize.base,
        color: colors.text,
    },
})

export const utilsStyles = StyleSheet.create({
    itemSeparator: {
        borderColor: colors.textMuted,
        borderWidth: StyleSheet.hairlineWidth,
        opacity: 0.3,
    },
    emptyComponentText: {
        ...defaultStyles.text,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 20,
    },
    slider:{
        height: 7,
        borderRadius: 16
    }
})