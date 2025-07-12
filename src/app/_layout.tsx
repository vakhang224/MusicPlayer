import { playerState } from "@/hooks/playerState"
import { trackPlayer } from "@/hooks/trackPlayer"
import { SplashScreen, Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useCallback } from "react"
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
      <RootNavigation/>
      <StatusBar style="auto"/>
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
    </Stack>
  )
}

export default App