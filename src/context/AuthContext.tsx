// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useLibraryStore } from '@/store/library';
import { getCurrentUser, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/services/authService';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar: string;
  isVerified: 0 | 1;
}

interface AuthContextData {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (updatedUserData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);
export const useAuth = () => useContext(AuthContext);

function normalizeUser(u: any) {
  if (!u) return u;
  const raw =
    u.isVerified ??
    u.verified ??
    u.is_verified ??
    u.artistIsVerified ??
    u.artist_is_verified ??
    u.artistIsVerified;
  const isVerified =
    raw === 1 || raw === '1' || raw === true || String(raw).toLowerCase() === 'true' ? 1 : 0;
  return { ...u, isVerified };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const libraryFetch = useLibraryStore((state) => state.fetch);

  useEffect(() => {
    const validateAndLoadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (!token) {
          setIsLoading(false);
          return;
        }

        const userData = await getCurrentUser();
        if (!userData) {
          setUser(null);
          setIsLoggedIn(false);
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
          setIsLoading(false);
          return;
        }

        // normalize user fields (ensure isVerified exists as 0|1)
        const normalized = normalizeUser(userData);
        // optional debug: console.log('[AuthProvider] normalized user:', normalized);

        setUser(normalized);
        setIsLoggedIn(true);
        await libraryFetch();
        // Also load recommendations for existing authenticated user if needed
        try {
          await useLibraryStore.getState().loadRecommendations();
        } catch (e) {
          // silent
        }
      } catch (e) {
        setUser(null);
        setIsLoggedIn(false);
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    validateAndLoadToken();
  }, []);

  const login = async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        setUser(null);
        setIsLoggedIn(false);
        return;
      }

      const normalized = normalizeUser(userData);
      setUser(normalized);
      setIsLoggedIn(true);

      await libraryFetch();
      try {
        await useLibraryStore.getState().loadRecommendations();
      } catch (e) {
        // silent
      }
    } catch (e) {
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      setIsLoggedIn(false);
      setUser(null);
      useLibraryStore.getState().clearRecommendations();
    } catch (e) {
      // silent
    }
  };

  const updateCurrentUser = (updatedUserData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      // ensure any incoming verified-related updates are normalized
      const merged = { ...prevUser, ...updatedUserData } as any;
      return normalizeUser(merged);
    });
  };

  const value = {
    isLoggedIn,
    isLoading,
    user,
    login,
    logout,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
