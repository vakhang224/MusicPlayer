// src/constants/playbackService.tsx
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { logPlayHistory } from '@/services/trackService'; // (Import này đã đúng)

// --- SỬA TOÀN BỘ LOGIC THEO DÕI ---

// Các biến toàn cục (global) trong scope của service
let currentTrackId: string | number | undefined = undefined;
let trackStartTime: number = 0; // Lưu thời gian bắt đầu (miliseconds)
let previousState: State | undefined = undefined; // Biến mới để theo dõi state
const LISTEN_THRESHOLD_SECONDS = 30; // 30 giây
const MINIMUM_LISTEN_SECONDS = 3; // Ngưỡng tối thiểu để log (tránh log lỗi)

/**
 * Hàm log (tách riêng)
 * Sẽ tính toán và log bài hát "currentTrackId" (bài vừa kết thúc)
 */
const logPreviousTrack = async () => {
    // 1. Kiểm tra xem có bài hát nào đang được theo dõi không
    if (!currentTrackId) {
        console.log(`[PlaybackService] Không có bài hát trước đó để log.`);
        return; 
    }

    // 2. Tính toán
    const elapsedTimeInSeconds = (Date.now() - trackStartTime) / 1000;

    // 3. Quyết định log hay không
    if (elapsedTimeInSeconds > MINIMUM_LISTEN_SECONDS) {
        const isListened = elapsedTimeInSeconds >= LISTEN_THRESHOLD_SECONDS ? 1 : 0;
        
        console.log(`[PlaybackService] LOGGING: Track ${currentTrackId}. Elapsed: ${Math.round(elapsedTimeInSeconds)}s. is_listened: ${isListened}`);
        
        // Gọi API "fire-and-forget" (đã sửa lỗi)
        logPlayHistory(currentTrackId, isListened);
    } else {
        console.log(`[PlaybackService] Bỏ qua log: Track ${currentTrackId} (nghe < ${MINIMUM_LISTEN_SECONDS}s)`);
    }

    // 4. Reset
    currentTrackId = undefined;
    trackStartTime = 0;
};


export const playbackService = async () => {
    
    // --- SỬA: Lắng nghe SỰ KIỆN STATE (quan trọng nhất) ---
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
        const currentState = event.state;
        
        // Bỏ qua nếu state không đổi
        if (currentState === previousState) return;

        // Kịch bản 1: Bài hát BẮT ĐẦU PHÁT (từ Paused, Ready, Buffering...)
        if (currentState === State.Playing && previousState !== State.Playing) {
            const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
            
            if (activeTrackIndex !== undefined) {
                const activeTrack = await TrackPlayer.getTrack(activeTrackIndex);
                
                // Kiểm tra xem đây có phải là một bài hát MỚI không
                if (activeTrack && activeTrack.id !== currentTrackId) {
                    
                    // Nếu là bài mới, log bài CŨ (nếu có)
                    await logPreviousTrack(); 
                    
                    // Và bắt đầu theo dõi bài MỚI
                    currentTrackId = activeTrack.id;
                    trackStartTime = Date.now();
                    console.log(`[PlaybackService] BẮT ĐẦU: ${activeTrack.title} (ID: ${currentTrackId})`);
                }
            }
        }

        // Kịch bản 2: Bài hát VỪA KẾT THÚC (hoặc bị dừng)
        // Nó đang từ 'Playing' (hoặc 'Buffering') chuyển sang 'Ready' (tự động hết bài) hoặc 'Stopped' (bị tắt)
        if ( (currentState === State.Ready || currentState === State.Stopped) && 
             (previousState === State.Playing || previousState === State.Buffering) ) 
        {
            console.log(`[PlaybackService] KẾT THÚC: (State: ${currentState})`);
            await logPreviousTrack();
        }

        // Luôn cập nhật state cuối cùng
        previousState = currentState;
    });
    

    // --- CÁC SỰ KIỆN GỐC CỦA BẠN (Giữ nguyên) ---
    // (RemoteStop đã được xử lý bằng Event.PlaybackState)
    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        console.log('[PlaybackService] Sự kiện RemoteStop (Tắt app).');
        // (Logic logPreviousTrack sẽ tự động chạy do state đổi thành Stopped)
        TrackPlayer.stop();
    });
    
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play();
    });
    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause();
    });
    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        // (Logic logPreviousTrack sẽ tự động chạy do state đổi)
        TrackPlayer.skipToNext();
    });
    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        // (Logic logPreviousTrack sẽ tự động chạy do state đổi)
        TrackPlayer.skipToPrevious();
    });
};