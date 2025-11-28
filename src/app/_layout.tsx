// MusicPlayer/src/app/_layout.tsx
import '@/i18n'; // <<< DÒNG NÀY PHẢI Ở ĐÂY (DÒNG 1)

import { LogBox, Platform } from 'react-native';
// Ẩn tất cả lỗi redbox CÓ CHỨA chuỗi này
LogBox.ignoreLogs([
  'Token expired, no refresh token'
]);

import { playbackService } from "@/constants/playbackService"
// <<< SỬA LỖI 1: Đổi tên import từ 'playerState' thành 'usePlayerState' >>>
import { usePlayerState } from "@/hooks/playerState"
import { useTrackPlayer } from "@/hooks/useTrackPlayer"
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useState } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { MenuProvider } from "react-native-popup-menu"
import { SafeAreaProvider } from "react-native-safe-area-context"
import TrackPlayer from "react-native-track-player"
import { AuthProvider, useAuth } from "@/context/AuthContext"

import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { colors, fontSize } from "@/constants/token";

/* -------------------------
   Global error handler + console filter
   ------------------------- */

// Keep original console functions for terminal logs
const _consoleError = console.error.bind(console);
const _consoleWarn = console.warn.bind(console);

// Những chuỗi lỗi bạn muốn lọc (không hiện RedBox / toast)
const filterMessages: string[] = [
  'Token expired, no refresh token',
  'Sai mật khẩu.',
];

// Kiểm tra chuỗi có cần lọc không
function shouldFilter(msg?: any) {
  try {
    if (!msg) return false;
    const s = typeof msg === 'string' ? msg : JSON.stringify(msg);
    return filterMessages.some((f) => s.includes(f));
  } catch {
    return false;
  }
}

// Ghi đè console.error / console.warn để vẫn in ra terminal nhưng giảm noisy in-app
console.error = (...args: any[]) => {
  if (shouldFilter(args[0])) {
    _consoleWarn('[filtered error]', ...args);
    return;
  }
  _consoleError(...args);
};

console.warn = (...args: any[]) => {
  if (shouldFilter(args[0])) {
    _consoleWarn('[filtered warn]', ...args);
    return;
  }
  _consoleWarn(...args);
};

// Global handler để chặn RedBox (không show RedBox trong app)
// Nếu muốn giữ RedBox khi dev, set swallowInDev = false
const swallowInDev = true;

const defaultHandler = (global as any).ErrorUtils && (global as any).ErrorUtils.getGlobalHandler && (global as any).ErrorUtils.getGlobalHandler();

function globalErrorHandler(error: any, isFatal?: boolean) {
  // Always log to terminal/Metro
  _consoleError('[GlobalErrorHandler] message:', error?.message);
  _consoleError('[GlobalErrorHandler] stack:', error?.stack);

  // If message matches filter, just warn and return
  if (shouldFilter(error?.message || error)) {
    _consoleWarn('[GlobalErrorHandler filtered]', error?.message || error);
    return;
  }

  // Show a short toast for users (no stack)
  try {
    Toast.show({
      type: 'error',
      text1: 'Đã xảy ra lỗi',
      text2: error?.message ? String(error.message).slice(0, 120) : 'Vui lòng thử lại',
      visibilityTime: 3000,
    });
  } catch (e) {
    // ignore toast errors
  }

  // In dev, allow RedBox only if swallowInDev is false
  if (__DEV__ && !swallowInDev) {
    if (defaultHandler) defaultHandler(error, isFatal);
    return;
  }

  // In production or when swallowing in dev: do not call defaultHandler => RedBox not shown
  // Optionally send to remote logging here
}

try {
  if ((global as any).ErrorUtils && (global as any).ErrorUtils.setGlobalHandler) {
    (global as any).ErrorUtils.setGlobalHandler(globalErrorHandler);
  }
} catch (e) {
  _consoleWarn('Could not set global error handler:', e);
}

/* -------------------------
   Toast config (giữ giao diện hiện tại)
   ------------------------- */
/* Nếu trước đây bạn có style toast riêng, chỉnh ở đây.
   Mẫu dưới dùng BaseToast/ErrorToast/InfoToast để giữ giao diện "compact" */
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        backgroundColor: '#1C1C1E', // Nền đen
        borderLeftColor: colors.primary, // Viền xanh
        borderLeftWidth: 5,
        width: '90%',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
      }}
      text2Style={{
        color: '#DDDDDD',
        fontSize: 14,
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        backgroundColor: '#1C1C1E',
        borderLeftColor: colors.primary,
        borderLeftWidth: 5,
        width: '90%',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
      }}
      text2Style={{
        color: '#DDDDDD',
        fontSize: 14,
      }}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        backgroundColor: '#1C1C1E',
        borderLeftColor: colors.primary,
        borderLeftWidth: 5,
        width: '90%',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
      }}
      text2Style={{
        color: '#DDDDDD',
        fontSize: 14,
      }}
    />
  ),
};

/**
 * Đây là component Layout gốc (Export Default)
 */
const App = () => {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <MenuProvider>
            <AppContent />
            <StatusBar style="auto" />
          </MenuProvider>
        </GestureHandlerRootView>
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </AuthProvider>
  )
}

/**
 * Component này chứa logic chính của app
 */
const AppContent = () => {
  // Lấy trạng thái từ AuthContext
  const { isLoading: isAuthLoading, isLoggedIn } = useAuth()

  // Khởi chạy hook useTrackPlayer
  useTrackPlayer({
    onLoad: useCallback(() => {
      // Player sẵn sàng
    }, []),
  })

  // <<< SỬA LỖI 2: Gọi hook 'usePlayerState' ở top-level >>>
  usePlayerState(); // Đây là cách gọi hook chính xác

  // (Đã xóa useEffect bọc playerState() đi)

  /**
   * Effect này ẩn Splash Screen
   */
  useEffect(() => {
    if (!isAuthLoading) {
      SplashScreen.hideAsync()
    }
  }, [isAuthLoading])

  /**
   * AUTH GUARD
   */
  const segments = useSegments()
  const router = useRouter()
  useEffect(() => {
    if (isAuthLoading) return;
    const firstSegment = segments[0];
    const isAuthRoute = !firstSegment || firstSegment === 'index';

    if (isLoggedIn && isAuthRoute) {
      router.replace('/(tabs)/');
    } else if (!isLoggedIn && !isAuthRoute) {
      router.replace('/');
    }
  }, [isLoggedIn, isAuthLoading, segments, router]);

  /**
   * CHỈ return null (màn hình xám) khi đang TẢI AUTH.
   */
  if (isAuthLoading) {
    return null;
  }

  // Khi Auth đã tải xong, render Navigation
  return <RootNavigation />;
}

/**
 * Component Navigation (Dùng STACK)
 */
const RootNavigation = () => {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
      <Stack.Screen name='(module)' options={{ headerShown: false }} />
      <Stack.Screen name='player' options={{
        presentation: 'card',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animationDuration: 400,
        headerShown: false,
      }} />
    </Stack>
  )
}

export default App
