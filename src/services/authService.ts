// src/services/authService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "./baseUrlManager";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// <<< Export Keys dùng chung
export const ACCESS_TOKEN_KEY = "app-access-token";
export const REFRESH_TOKEN_KEY = "app-refresh-token";

const getAuthUrl = () => `${getBaseUrl()}/auth`;

// Helper: robust check whether body is FormData (covers RN/Expo differences)
const isBodyFormData = (body: any) => {
  if (!body) return false;
  try {
    if (typeof FormData !== "undefined" && body instanceof FormData) return true;
  } catch {}
  // fallback: Expo/React Native FormData may expose _parts
  if (typeof body === "object" && Array.isArray((body as any)?._parts)) return true;
  return false;
};

// ================= AUTHFETCH THÔNG MINH =================
export const authFetch = async (url: string, options: any = {}): Promise<Response | null> => {
  try {
    let token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const isFormData = isBodyFormData(options.body);

    console.log(`[authFetch] Gọi ${options.method || "GET"} đến: ${url}`);
    console.log(`[authFetch] Is FormData: ${isFormData}`);
    console.log(`[authFetch] Token hiện tại: ${token}`);

    const headers: any = {
      ...(options.headers || {}),
    };
    // Chỉ thêm Authorization nếu có token
    if (token) headers.Authorization = `Bearer ${token}`;

    // Không set Content-Type khi là FormData (để fetch tự thêm boundary)
    if (isFormData) {
      if (headers["Content-Type"]) delete headers["Content-Type"];
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    let res = await fetch(url, { ...options, headers });

    // Nếu 401 → thử refresh token (chỉ thực hiện retry 1 lần)
    if (res.status === 401) {
      console.log("⚠️ [authFetch] Token expired — attempting silent refresh...");
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        console.log("⚠️ [authFetch] No refresh token available. Clearing tokens.");
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        return null;
      }

      const refreshRes = await fetch(`${getAuthUrl()}/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) {
        console.log("⚠️ [authFetch] Refresh token invalid/expired.");
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        return null;
      }

      const data = await refreshRes.json();
      if (data?.accessToken && data?.refreshToken) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
        token = data.accessToken;
      } else {
        console.log("⚠️ [authFetch] Refresh response missing tokens.");
        return null;
      }

      console.log("[authFetch] Refresh thành công, retry request...");

      const retryHeaders: any = {
        ...(options.headers || {}),
      };
      if (token) retryHeaders.Authorization = `Bearer ${token}`;
      if (isFormData) {
        if (retryHeaders["Content-Type"]) delete retryHeaders["Content-Type"];
      } else {
        retryHeaders["Content-Type"] = retryHeaders["Content-Type"] || "application/json";
      }

      // IMPORTANT: do not attempt to clone FormData for automatic retries elsewhere.
      res = await fetch(url, { ...options, headers: retryHeaders });
    }

    return res;
  } catch (err: any) {
    console.log("⚠️ [authFetch] Network/system error:", err?.message || err);
    return null;
  }
};

// ================= REGISTER =================
export const register = async (username: string, email: string, password: string, name?: string) => {
  const res = await fetch(`${getAuthUrl()}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, name }),
  });
  if (!res.ok) {
    let errorMessage = `HTTP error ${res.status}`;
    try { const errData = await res.json(); errorMessage = errData.message || errorMessage; } catch {}
    throw new Error(errorMessage);
  }
  return res.json();
};

// ================= LOGIN =================
export const login = async (username: string, password: string) => {
  const res = await fetch(`${getAuthUrl()}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let errorMessage = `HTTP error ${res.status}`;
    try { const errData = await res.json(); errorMessage = errData.message || errorMessage; } catch {}
    throw new Error(errorMessage);
  }

  const data = await res.json();
  if (data.accessToken && data.refreshToken) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
  } else console.warn("⚠️ Missing accessToken or refreshToken in login response");

  return data;
};

// ================= GET CURRENT USER =================
export const getCurrentUser = async (): Promise<any> => {
  const res = await authFetch(`${getAuthUrl()}/me`, { method: "GET" });
  if (!res || !res.ok) return null;
  return res.json();
};

// ================= REFRESH TOKEN =================
export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const res = await fetch(`${getAuthUrl()}/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    return null;
  }

  const data = await res.json();
  if (data.accessToken && data.refreshToken) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    return data.accessToken;
  }

  return null;
};

// ================= FORGOT & RESET PASSWORD =================
export const requestPasswordReset = async (email: string) => {
  const res = await fetch(`${getAuthUrl()}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
};

export const resetPassword = async (email: string, code: string, newPassword: string) => {
  const res = await fetch(`${getAuthUrl()}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
};

// ================= UPLOAD AVATAR =================
export const uploadAvatar = async (avatarUri: string): Promise<{ avatarUrl: string; message: string }> => {
  try {
    let uri = avatarUri;

    // Android content:// -> fetch blob then convert to object suitable for FormData
    if (Platform.OS === "android" && uri.startsWith("content://")) {
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Failed to fetch content URI: ${response.status}`);
      const blob = await response.blob();
      // Some environments don't have File constructor; FormData.append can accept a blob with a filename in RN.
      // We'll append a simple object for RN fetch compatibility.
      uri = { uri: avatarUri, name: `avatar_${Date.now()}.jpg`, type: blob.type } as any;
    }

    const formData = new FormData();
    if (typeof uri === "string") {
      const extMatch = avatarUri.match(/\.(jpg|jpeg|png)$/i);
      const ext = extMatch ? extMatch[0] : ".jpg";
      const type = `image/${ext.replace(".", "")}`;
      formData.append("avatarFile", { uri: avatarUri, name: `avatar_${Date.now()}${ext}`, type } as any);
    } else {
      // uri is already an object with uri/name/type
      formData.append("avatarFile", uri as any);
    }

    const res = await authFetch(`${getAuthUrl()}/avatar`, { method: "POST", body: formData });
    if (!res || !res.ok) return { avatarUrl: "", message: "Upload failed" };
    return res.json();
  } catch (error) {
    console.log("⚠️ [authService] UploadAvatar error:", error);
    return { avatarUrl: "", message: "Upload failed" };
  }
};
