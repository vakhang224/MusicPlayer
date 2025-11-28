// src/hooks/useTrackPlayer.tsx
import { useEffect, useRef } from "react";
import TrackPlayer, { Capability, RatingType, RepeatMode } from "react-native-track-player";

/**
 * Biến này nằm BÊN NGOÀI hook
 * Nó sẽ tồn tại trong suốt vòng đời của ứng dụng.
 */
let hasPlayerBeenInitialized = false;

// <<< XÓA: Biến hasServiceBeenRegistered (không cần nữa, đã chuyển sang index.ts) >>>

// Hàm setupPlayer (ĐÃ SỬA LỖI)
const setupPlayer = async () => {
    // <<< SỬA: Chúng ta chỉ setup MỘT LẦN >>>
    if (hasPlayerBeenInitialized) {
        return; // Đã setup, không làm gì cả
    }
    
    try {
        await TrackPlayer.setupPlayer({
            maxCacheSize: 1024 * 10,
        });

        await TrackPlayer.updateOptions({
            ratingType: RatingType.Heart,
            capabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.Stop]
        });

        await TrackPlayer.setVolume(0.5);
        await TrackPlayer.setRepeatMode(RepeatMode.Queue);

        hasPlayerBeenInitialized = true; // <<< SỬA: Chỉ set true KHI THÀNH CÔNG >>>
        console.log("[setupPlayer] Khởi tạo TrackPlayer thành công.");

    } catch (error: any) {
        // <<< SỬA: Xử lý lỗi "đã initialized" một cách an toàn >>>
        if (error.message.includes("already been initialized")) {
            console.warn("[setupPlayer] Player đã được khởi tạo (bình thường).");
            hasPlayerBeenInitialized = true; // Đánh dấu là đã setup
        } else {
            console.error("Lỗi setup TrackPlayer:", error);
        }
    }
};

// Hook useTrackPlayer
export const useTrackPlayer = ({ onLoad }: { onLoad?: () => void }) => {
    // Chúng ta vẫn dùng ref để lưu onLoad một cách an toàn
    const onLoadRef = useRef(onLoad);
    useEffect(() => {
        onLoadRef.current = onLoad;
    }, [onLoad]);

    useEffect(() => {
        // <<< XÓA: Toàn bộ logic register service ở đây (đã chuyển ra index.ts) >>>

        // Chỉ cần chạy setupPlayer.
        // Hàm setupPlayer giờ đã tự kiểm tra (idempotent)
        setupPlayer()
            .then(() => {
                // Khi setup xong (hoặc đã setup), gọi onLoad
                onLoadRef.current?.();
            })
            .catch(error => {
                // Mặc dù setupPlayer đã tự catch, chúng ta vẫn log
                console.error("Lỗi setup TrackPlayer trong hook:", error);
            });
        
        // Vẫn chạy 1 lần duy nhất khi mount
    }, []); // Mảng dependency rỗng
};