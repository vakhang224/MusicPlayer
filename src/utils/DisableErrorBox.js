import { LogBox } from "react-native";

export function disableErrorBox() {
  // 1. Ẩn toàn bộ LogBox (popup đỏ, popup vàng...)
  LogBox.ignoreAllLogs(true);

  // 2. Chặn lỗi JS Exception
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log("GLOBAL ERROR:", error); // vẫn log vào console
    // KHÔNG hiện redbox
    // Không gọi originalHandler để tránh expo hiển thị đỏ
  });
}
