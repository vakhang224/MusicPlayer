import { Platform } from "react-native";

let cachedBaseUrl: string | null = null;

// <<< SỬA TẠI ĐÂY >>>
// Dùng CHÍNH XÁC IP LAN bạn đã điền ở file serverConfig.js
// (Ví dụ: 'http://192.168.1.10:8080')
const DEFAULT_CONFIG_SERVER = "http://192.168.1.9:8080";

/**
 * Hàm khởi tạo: gọi server /config/base-url để lấy BASE_URL thật
 * Nên được gọi 1 lần khi app start (ví dụ ở App.tsx hoặc trong store.fetch())
 */
export const initBaseUrl = async (): Promise<string> => {
  if (cachedBaseUrl) return cachedBaseUrl;

  try {
    const res = await fetch(`${DEFAULT_CONFIG_SERVER}/config/base-url`);
    if (!res.ok) throw new Error(`Failed to fetch baseUrl: ${res.status}`);

    const data = await res.json();
    if (data?.baseUrl) {
      cachedBaseUrl = data.baseUrl;
      return cachedBaseUrl as string;
    }

    throw new Error("baseUrl not found in response");
  } catch (err) {
    console.error("⚠️ Lỗi khi fetch baseUrl, dùng DEFAULT_CONFIG_SERVER:", err);
    cachedBaseUrl = DEFAULT_CONFIG_SERVER;
    return cachedBaseUrl;
  }
};

/**
 * Hàm đồng bộ để lấy baseUrl hiện tại.
 * - Nếu initBaseUrl đã chạy → dùng cached
 * - Nếu chưa có → fallback về DEFAULT_CONFIG_SERVER
 */
export const getBaseUrl = (): string => {
  return cachedBaseUrl ?? DEFAULT_CONFIG_SERVER;
};