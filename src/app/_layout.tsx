import { colors } from "@/constants/token"
import { playerState } from "@/hooks/playerState"
import { trackPlayer } from "@/hooks/trackPlayer"
import { SplashScreen, Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useCallback } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { MenuProvider } from "react-native-popup-menu"
import { SafeAreaProvider } from "react-native-safe-area-context"

SplashScreen.preventAutoHideAsync()

const App = () => {

  const handleTrackPlayerLoad = useCallback(() => {
    SplashScreen.hideAsync()
  }, [])

  trackPlayer({
    onLoad: handleTrackPlayerLoad
  })

   playerState()


  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{flex:1}}>

          <RootNavigation/>

        <StatusBar style="auto"/>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

const RootNavigation = () => {
  return (
    <Stack>
      <Stack.Screen name='(tabs)' options={{ headerShown: false }}/>
      <Stack.Screen name='player' options={{
        presentation: 'card',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animationDuration: 400,
         headerShown: false 
      }}/>
      <Stack.Screen
        name='(module)/addToPlaylist'
        options={{
          presentation: 'modal',
          headerStyle: {
            backgroundColor: colors.background
          },
          headerTitle: 'Add to playlist',
          headerTitleStyle: {
            color: colors.text
          }
        }}
      />
    </Stack>
  )
}

export default App