// src/store/queue.tsx
import { create } from "zustand";
import TrackPlayer, { Track, Event } from "react-native-track-player";
import { normalizeUrl } from "@/helpers/url";

export type QueueState = {
  activeQueueId: string | null;           // app-level queue/list id (songs-, playlists-...)
  nativeActiveTrackId: string | null;     // native player's current track id (from TrackPlayer)
  userActivated: boolean;
  setActiveQueueId: (id: string | null) => void;
  setNativeActiveTrackId: (id: string | null) => void;
  setUserActivated: (v: boolean) => void;
  initializeQueue: (tracks: Track[], startIndex?: number, force?: boolean, autoPlay?: boolean) => Promise<void>;
  setActiveQueue: (tracks: Track[], queueId: string) => Promise<void>;
  playTrack: (track: Track) => Promise<void>;

  // New APIs
  setActiveQueueFromIndex: (tracks: Track[], startIndex?: number, queueId?: string | null, autoPlay?: boolean) => Promise<void>;
  playSelectedFromList: (tracks: Track[], selectedIndex?: number, queueId?: string | null) => Promise<void>;
};

let playLock = false;
let lastPlayTs = 0;

const filterValidTracks = (tracks: Track[]) => {
  const validTracks = tracks.filter((track) => !!track.url);
  if (validTracks.length === 0) {
    console.warn("[QueueStore] Không tìm thấy track hợp lệ (có url) để thêm vào hàng đợi.");
  }
  return validTracks;
};

const toAddTrack = (t: Track) => {
  const url = normalizeUrl((t as any).url ?? t.url);
  return {
    id: String((t as any).id ?? url ?? Math.random().toString()),
    url,
    title: (t as any).title ?? (t as any).name ?? "Unknown Title",
    artist: (t as any).artist ?? (t as any).artists ?? "Unknown Artist",
    artwork: (t as any).artwork ? normalizeUrl((t as any).artwork) : undefined,
    genre: (t as any).genre,
  } as any;
};

const waitForNativeQueueUpdate = (ms = 200) => new Promise((r) => setTimeout(r, ms));

let hasSubscribedPlaybackEvents = false;

export const findTrackIndexInQueueByUrl = async (rawUrl: string) => {
  try {
    const desired = normalizeUrl(String(rawUrl ?? ""));
    console.log("[findTrackIndex] desired(normalized):", desired);

    const q = await TrackPlayer.getQueue();
    if (!Array.isArray(q)) {
      console.warn("[findTrackIndex] queue not array:", q);
      return -1;
    }

    const getFilename = (u: string) => {
      try {
        const parts = u.split("/").filter(Boolean);
        return parts.length ? parts[parts.length - 1] : u;
      } catch {
        return u;
      }
    };

    // 1) exact normalized match
    for (let i = 0; i < q.length; i++) {
      const qUrl = normalizeUrl(String(q[i]?.url ?? ""));
      if (qUrl === desired) {
        console.log("[findTrackIndex] matched by normalized exact at", i, qUrl);
        return i;
      }
    }

    // 2) try decodeURI(normalized) vs normalized
    try {
      const decodedDesired = normalizeUrl(decodeURI(desired));
      for (let i = 0; i < q.length; i++) {
        const qUrl = normalizeUrl(String(q[i]?.url ?? ""));
        if (qUrl === decodedDesired) {
          console.log("[findTrackIndex] matched by decodeURI(desired) at", i, qUrl);
          return i;
        }
      }
    } catch (e) {
      // ignore decode errors
    }

    // 3) try encodeURI of raw input (in case rawUrl was unencoded)
    try {
      const encodedDesired = normalizeUrl(encodeURI(String(rawUrl ?? "")));
      for (let i = 0; i < q.length; i++) {
        const qUrl = normalizeUrl(String(q[i]?.url ?? ""));
        if (qUrl === encodedDesired) {
          console.log("[findTrackIndex] matched by encodeURI(raw) at", i, qUrl);
          return i;
        }
      }
    } catch (e) {
      // ignore
    }

    // 4) try matching by filename (last segment) as fallback
    const desiredFilename = getFilename(desired).toLowerCase();
    for (let i = 0; i < q.length; i++) {
      const qUrlRaw = String(q[i]?.url ?? "");
      const qFilename = getFilename(qUrlRaw).toLowerCase();
      if (qFilename && qFilename === desiredFilename) {
        console.log("[findTrackIndex] matched by filename fallback at", i, qUrlRaw);
        return i;
      }
    }

    // 5) last resort: log queue for debugging and return -1
    console.warn("[findTrackIndex] Track not found. desired:", rawUrl);
    console.log("[findTrackIndex] Queue snapshot (first 30 entries):");
    q.slice(0, 30).forEach((t, idx) => {
      console.log(idx, "->", String(t?.url ?? ""));
    });

    return -1;
  } catch (err) {
    console.error("[findTrackIndex] error:", err);
    return -1;
  }
};

export const useQueueStore = create<QueueState>()((set, get) => {
  const ensureSubscribed = () => {
    if (hasSubscribedPlaybackEvents) return;
    try {
      if (typeof TrackPlayer.addEventListener === "function") {
        TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (data: any) => {
          try {
            // Determine native active track id (do NOT overwrite activeQueueId)
            const idx = data?.nextTrack ?? data?.track ?? null;
            let newNativeTrackId: string | null = null;
            if (typeof idx === "number") {
              const q = await TrackPlayer.getQueue();
              const t = q[idx];
              newNativeTrackId = t ? String((t as any).id ?? null) : null;
            } else {
              const activeIdx = await TrackPlayer.getActiveTrackIndex();
              if (typeof activeIdx === "number") {
                const q = await TrackPlayer.getQueue();
                const t = q[activeIdx];
                newNativeTrackId = t ? String((t as any).id ?? null) : null;
              } else {
                newNativeTrackId = null;
              }
            }

            // Only set nativeActiveTrackId (separate from activeQueueId)
            const prevNative = get().nativeActiveTrackId;
            if (prevNative !== newNativeTrackId) {
              set({ nativeActiveTrackId: newNativeTrackId });
            }
          } catch (e) {
            // ignore
          }
        });
      }
    } catch (e) {
      // ignore
    }
    hasSubscribedPlaybackEvents = true;
  };

  ensureSubscribed();

  /**
   * Helper: build rotated add list so that startIndex becomes first element.
   */
  const buildRotatedAddList = (tracks: Track[], startIndex: number) => {
    const valid = filterValidTracks(tracks);
    if (valid.length === 0) return [];
    const idx = Math.max(0, Math.min(startIndex, valid.length - 1));
    const rotated = valid.slice(idx).concat(valid.slice(0, idx));
    return rotated.map(toAddTrack);
  };

  /**
   * Helper: wait until native active index equals expectedIndex or timeout.
   */
  const waitForActiveIndex = async (expectedIndex: number, timeoutMs = 2000, intervalMs = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const ai = await TrackPlayer.getActiveTrackIndex();
        if (typeof ai === "number" && ai === expectedIndex) return true;
      } catch (e) {
        // ignore
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  };

  return {
    activeQueueId: null,
    nativeActiveTrackId: null,
    userActivated: false,
    setActiveQueueId: (id) => set({ activeQueueId: id }),
    setNativeActiveTrackId: (id) => set({ nativeActiveTrackId: id }),
    setUserActivated: (v) => set({ userActivated: v }),

    initializeQueue: async (tracks, startIndex = 0, force = false, autoPlay = false) => {
      console.log(`[QueueStore] Initializing queue with ${tracks.length} tracks, startIndex=${startIndex}, force=${force}, autoPlay=${autoPlay}`);
      try {
        try { await TrackPlayer.setupPlayer(); } catch (e) { /* ignore if already */ }

        if (!force) {
          try {
            const existing = await TrackPlayer.getQueue();
            if (Array.isArray(existing) && existing.length > 0) {
              console.log("[QueueStore] initializeQueue skipped because queue already populated and force=false");
              return;
            }
          } catch (e) {
            // ignore getQueue errors and continue
          }
        }

        await TrackPlayer.reset();
        const validTracks = filterValidTracks(tracks);
        if (validTracks.length === 0) return;

        const addTracks = validTracks.map(toAddTrack);
        await TrackPlayer.add(addTracks);

        await waitForNativeQueueUpdate(250);

        let adjustedStartIndex = startIndex;
        if (tracks.length !== validTracks.length) {
          const originalStartTrack = tracks[startIndex];
          adjustedStartIndex = originalStartTrack ? validTracks.findIndex((t) => String((t as any).id) === String((originalStartTrack as any).id)) : 0;
          if (adjustedStartIndex === -1) adjustedStartIndex = 0;
          console.log(`[QueueStore] Adjusted start index to ${adjustedStartIndex} due to filtering.`);
        }

        if (adjustedStartIndex > 0 && adjustedStartIndex < validTracks.length) {
          await TrackPlayer.skip(adjustedStartIndex);
        }

        if (autoPlay) {
          await TrackPlayer.play();
        }

        // IMPORTANT: do not set userActivated here. Only set activeQueueId/userActivated when user explicitly activates.
        if (autoPlay) {
          const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
          if (typeof currentTrackIndex === "number" && addTracks[currentTrackIndex]) {
            const currentTrackId = String(addTracks[currentTrackIndex]?.id ?? null);
            // set nativeActiveTrackId (not activeQueueId)
            set({ nativeActiveTrackId: currentTrackId });
            console.log(`[QueueStore] Queue initialized and auto-played. Current native track ID: ${currentTrackId}`);
          } else {
            set({ nativeActiveTrackId: null });
            console.log(`[QueueStore] Queue initialized (autoPlay) but couldn't get current track ID.`);
          }
        } else {
          console.log("[QueueStore] Queue preloaded (autoPlay=false). activeQueueId/userActivated not set.");
        }
      } catch (error) {
        console.error("[QueueStore] Error initializing queue:", error);
      }
    },

    setActiveQueue: async (tracks, queueId) => {
      try {
        try { await TrackPlayer.setupPlayer(); } catch (e) { /* ignore */ }

        await TrackPlayer.reset();
        const validTracks = filterValidTracks(tracks);
        if (validTracks.length === 0) return;

        const addTracks = validTracks.map(toAddTrack);
        await TrackPlayer.add(addTracks);

        await waitForNativeQueueUpdate(200);

        set({ activeQueueId: queueId });
        console.log(`[QueueStore] Đã set active queue: ${queueId}`);
      } catch (error) {
        console.error("[QueueStore] Lỗi khi set active queue:", error);
      }
    },

    playTrack: async (track) => {
      const now = Date.now();
      const COOLDOWN_MS = 300;
      if (now - lastPlayTs < COOLDOWN_MS) {
        console.log("[Q] playTrack ignored due to cooldown", { sinceLastMs: now - lastPlayTs });
        return;
      }

      if (playLock) {
        console.log("[Q] playTrack skipped because another play is in progress");
        return;
      }
      playLock = true;
      lastPlayTs = now;

      try {
        console.log("[Q] playTrack called for:", { id: (track as any).id, url: (track as any).url, title: (track as any).title });

        try {
          console.log("[Q] calling setupPlayer()");
          const t0 = Date.now();
          await TrackPlayer.setupPlayer();
          console.log("[Q] setupPlayer() done", { tookMs: Date.now() - t0 });
        } catch (e) {
          console.log("[Q] setupPlayer() warning/ignored: The player has already been initialized via setupPlayer.");
        }

        try {
          const activeIdx = await TrackPlayer.getActiveTrackIndex();
          if (typeof activeIdx === "number") {
            const q = await TrackPlayer.getQueue();
            const activeTrack = q[activeIdx];
            const desiredUrl = normalizeUrl((track as any).url ?? track.url);
            const activeUrl = normalizeUrl(String(activeTrack?.url ?? ""));
            if (desiredUrl && activeUrl && desiredUrl === activeUrl) {
              const state = await (TrackPlayer as any).getState?.();
              const playingStates = ["playing", "ready", "buffering", "loading"];
              if (typeof state === "string" ? playingStates.includes(state) : (state === 3 || state === 2)) {
                console.log("[Q] desired track already active and player in playing/ready state — skipping playTrack");
                return;
              }
            }
          }
        } catch (e) {
          // ignore active check errors
        }

        try {
          const q0 = await TrackPlayer.getQueue();
          console.log("[Q] initial getQueue()", { length: q0.length, urls: q0.map(q => normalizeUrl(String(q?.url ?? ""))) });
        } catch (e) {
          console.warn("[Q] getQueue() initial failed:", (e as any)?.message || e);
        }

        const desiredId = String((track as any).id ?? track.url ?? "");
        const desiredUrl = normalizeUrl((track as any).url ?? track.url);
        console.log("[Q] desiredId/desiredUrl:", { desiredId, desiredUrl });

        const currentQueue = await TrackPlayer.getQueue();
        let trackIndex = currentQueue.findIndex((t) => String((t as any).id) === desiredId);
        if (trackIndex === -1 && desiredUrl) {
          trackIndex = currentQueue.findIndex((q) => {
            if (!q?.url) return false;
            return normalizeUrl(String(q.url)) === desiredUrl;
          });
        }
        console.log("[Q] found in queue index:", trackIndex);

        if (trackIndex > -1) {
          console.log("[Q] skipping to existing index", trackIndex);
          await TrackPlayer.skip(trackIndex);
          const activeIdx = await TrackPlayer.getActiveTrackIndex();
          console.log("[Q] after skip activeIdx:", activeIdx);
          await TrackPlayer.play();
          const state = await (TrackPlayer as any).getState?.();
          console.log("[Q] after play state:", state);
          return;
        }

        console.warn(`[QueueStore] playTrack: Track ${desiredId} không tìm thấy trong hàng đợi. Sẽ append vào queue.`); 
        const addObj = toAddTrack(track);
        if (!addObj.url) {
          console.warn("[QueueStore] playTrack: track has no valid url, aborting append.");
          return;
        }

        await TrackPlayer.add([addObj]);

        const MAX_RETRIES = 8;
        const RETRY_DELAY = 200; // ms

        console.log("[Q] playTrack desiredId:", desiredId, "desiredUrl:", desiredUrl);
        let foundIdx = -1;
        for (let i = 0; i < MAX_RETRIES; i++) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
          const qTry = await TrackPlayer.getQueue();
          const qUrls = qTry.map(q => ({ id: (q as any).id, url: normalizeUrl(String(q?.url ?? "")) }));
          console.log(`[Q] getQueue try ${i} length=${qTry.length}`, qUrls);
          foundIdx = qTry.findIndex((q) => String((q as any).id) === String(addObj.id) || normalizeUrl(String(q?.url ?? "")) === addObj.url);
          if (foundIdx > -1) {
            console.log(`[Q] Found appended track at index ${foundIdx} after ${i+1} tries`);
            break;
          }
        }

        if (foundIdx > -1) {
          console.log("[Q] skipping to appended index", foundIdx);
          await TrackPlayer.skip(foundIdx);
          const activeIdx = await TrackPlayer.getActiveTrackIndex();
          console.log("[Q] after skip activeIdx:", activeIdx);
          await TrackPlayer.play();
          const state = await (TrackPlayer as any).getState?.();
          console.log("[Q] after play state:", state);
        } else {
          console.warn("[QueueStore] playTrack: appended track not found in queue after retries, performing reset fallback.");
          await TrackPlayer.reset();
          await TrackPlayer.add([addObj]);
          await waitForNativeQueueUpdate(300);
          await TrackPlayer.play();
          const qFinal = await TrackPlayer.getQueue();
          console.log("[Q] after fallback reset queue length:", qFinal.length, qFinal.map(q => normalizeUrl(String(q?.url ?? ""))));
        }
      } catch (error) {
        console.error("[Q] playTrack error:", error);
      } finally {
        playLock = false;
        lastPlayTs = Date.now();
      }
    },

    // --- New: setActiveQueueFromIndex and playSelectedFromList ---
    setActiveQueueFromIndex: async (tracks, startIndex = 0, queueId = null, autoPlay = false) => {
      try {
        try { await TrackPlayer.setupPlayer(); } catch (e) {}
        await TrackPlayer.reset();

        const addTracks = buildRotatedAddList(tracks, startIndex);
        if (addTracks.length === 0) return;

        await TrackPlayer.add(addTracks);
        await waitForNativeQueueUpdate(200);

        // mark app-level queue and user activation
        set({ activeQueueId: queueId ?? null, userActivated: !!queueId });

        // ensure native active index settled to 0 before play
        if (autoPlay) {
          await waitForActiveIndex(0, 1500, 100);
          try { await TrackPlayer.play(); } catch (e) { /* fallback ignored */ }

          // update nativeActiveTrackId from queue[0]
          try {
            const q = await TrackPlayer.getQueue();
            const t0 = q[0];
            const newNativeId = t0 ? String((t0 as any).id ?? null) : null;
            const prevNative = get().nativeActiveTrackId;
            if (prevNative !== newNativeId) set({ nativeActiveTrackId: newNativeId });
          } catch (e) {}
        }
      } catch (err) {
        console.error("[QueueStore] setActiveQueueFromIndex error:", err);
      }
    },

    playSelectedFromList: async (tracks, selectedIndex = 0, queueId = null) => {
      if (!Array.isArray(tracks) || tracks.length === 0) return;
      await get().setActiveQueueFromIndex(tracks, selectedIndex, queueId, true);
    },
  };
});

export const useQueue = useQueueStore;
