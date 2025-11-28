// src/services/trackService.ts
import { Track } from "react-native-track-player";
import { getBaseUrl } from "./baseUrlManager";
import { Playlist, TrackWithPlaylist } from "@/helpers/type";
import { authFetch } from './authService';
import * as FileSystem from 'expo-file-system';
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ACCESS_TOKEN_KEY } from "@/services/authService";

// ====================== HELPER REQUEST ======================
const request = async (url: string, options: RequestInit = {}) => {
  const fullUrl = `${getBaseUrl()}${url}`;

  // Only set Content-Type if body is a JSON string
  const headers: Record<string, string> = { ...(options.headers as any) };
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await authFetch(fullUrl, { ...options, headers });
  if (!res || !res.ok) {
    let errorMessage = `HTTP error ${res?.status}`;
    try {
      const errData = await res?.json();
      errorMessage = errData?.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
  return res.json();
};

// ====================== FILENAME / URI HELPERS ======================
const ensureFileScheme = (path: string) => (path.startsWith("file://") ? path : `file://${path}`);

const sanitizeFileName = (raw: string, fallbackExt?: string) => {
  try { raw = decodeURIComponent(raw); } catch {}
  let name = raw.split("/").pop() || `file_${Date.now()}`;
  name = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (fallbackExt && !name.includes(".")) name += fallbackExt;
  return name;
};

const assertFileExists = async (uri: string) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) throw new Error(`File not found: ${uri}`);
  } catch (e) {
    const noScheme = uri.replace(/^file:\/\//, "");
    const info = await FileSystem.getInfoAsync(noScheme);
    if (!info.exists) throw new Error(`File not found: ${uri}`);
  }
};

const getFileUri = async (uri: string, kind: "audio" | "artwork") => {
  if (!uri) return "";

  if (!uri.startsWith("content://") && !uri.startsWith("file://")) {
    console.warn(`[TrackService] ${kind} URI not valid: ${uri}`);
    throw new Error(`Đường dẫn ${kind} không hợp lệ. Vui lòng chọn lại file.`);
  }

  if (uri.startsWith("content://")) {
    const fallbackExt = kind === "audio" ? ".mp3" : ".jpg";
    const safeName = sanitizeFileName(uri, fallbackExt);
    const destPath = `${FileSystem.cacheDirectory}${safeName}`;
    try {
      console.log(`[TrackService] Copying content URI ${uri} -> ${destPath}`);
      await FileSystem.copyAsync({ from: uri, to: destPath });
      const result = ensureFileScheme(destPath);
      await assertFileExists(result);
      return result;
    } catch (e) {
      // Try fallback: fetch then write to cache (some Android content URIs may not copy)
      try {
        const resp = await fetch(uri);
        if (!resp.ok) throw new Error(`Failed to fetch content URI: ${resp.status}`);
        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const bufferBase64 = Buffer.from(arrayBuffer).toString('base64');
        await FileSystem.writeAsStringAsync(destPath, bufferBase64, { encoding: FileSystem.EncodingType.Base64 });
        const result = ensureFileScheme(destPath);
        await assertFileExists(result);
        return result;
      } catch (e2) {
        throw new Error(`Không thể xử lý ${kind} URI: ${uri}`);
      }
    }
  }

  if (uri.startsWith("file://")) {
    await assertFileExists(uri);
    return uri;
  }

  throw new Error(`Không thể xử lý ${kind} URI: ${uri}`);
};

// ====================== TRACKS ======================
export const fetchTracks = async (): Promise<Track[]> => {
  try {
    const data = await request(`/tracks?page=1&limit=20`);
    return (Array.isArray(data) ? data : data?.tracks || []) as Track[];
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bài hát:", error);
    throw error;
  }
};

// ====================== UPLOAD TRACK (initial upload) ======================
export const uploadTrack = async (
  title: string, artists: string, audioUri: string, artworkUri?: string | null, uri?: string | undefined
): Promise<any> => {
  const uploadUrl = `${getBaseUrl()}/tracks/upload`;
  const formData = new FormData();

  formData.append('title', title);
  formData.append('artists', artists);

  const fixedAudioUri = await getFileUri(audioUri, "audio");
  let audioName = sanitizeFileName(fixedAudioUri);
  if (!audioName.includes(".")) audioName += ".mp3";

  let audioType = 'audio/mpeg';
  const lowerAudio = audioName.toLowerCase();
  if (lowerAudio.endsWith('m4a')) audioType = 'audio/mp4';
  else if (lowerAudio.endsWith('wav')) audioType = 'audio/wav';
  else if (lowerAudio.endsWith('ogg')) audioType = 'audio/ogg';

  console.log(`[TrackService] Appending audio: URI=${fixedAudioUri}, Name=${audioName}, Type=${audioType}`);
  formData.append('audioFile', { uri: fixedAudioUri, name: audioName, type: audioType } as any);

  if (artworkUri) {
    const fixedArtworkUri = await getFileUri(artworkUri, "artwork");
    let artName = sanitizeFileName(fixedArtworkUri);
    if (!artName.includes(".")) artName += ".jpg";

    let artType = 'image/jpeg';
    const lowerArt = artName.toLowerCase();
    if (lowerArt.endsWith('png')) artType = 'image/png';
    else if (lowerArt.endsWith('gif')) artType = 'image/gif';
    else if (lowerArt.endsWith('webp')) artType = 'image/webp';

    console.log(`[TrackService] Appending artwork: URI=${fixedArtworkUri}, Name=${artName}, Type=${artType}`);
    formData.append('artworkFile', { uri: fixedArtworkUri, name: artName, type: artType } as any);
  }

  try {
    const response = await authFetch(uploadUrl, { method: 'POST', body: formData });
    if (!response) throw new Error("Xác thực thất bại, không thể tải lên.");
    const responseText = await response.text();
    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try { errorMessage = JSON.parse(responseText).message || errorMessage; } catch { errorMessage = responseText || errorMessage; }
      throw new Error(errorMessage);
    }
    console.log("[TrackService] Upload successful");
    return JSON.parse(responseText);
  } catch (error: any) {
    console.error('[TrackService] Lỗi trong uploadTrack:', error.message);
    throw error;
  }
};

// ====================== FAVORITES / PLAYLIST / MY UPLOADS ======================
export const toggleFavorite = async (trackId: number): Promise<{ trackId: number, isFavorite: boolean }> =>
  request(`/tracks/favorites/${trackId}/toggle`, { method: "POST" });

export const fetchFavorites = async (): Promise<number[]> => {
  const data = await request(`/tracks/favorites`);
  return Array.isArray(data) ? data.map((t: any) => t.id) : [];
};

export const fetchPlaylistsWithTracks = async (): Promise<Playlist[]> => request(`/tracks/playlists`);
export const createPlaylist = async (name: string) =>
  request(`/tracks/playlists`, { method: "POST", body: JSON.stringify({ name }) });
export const addTrackToPlaylist = async (playlistId: number, trackId: number) =>
  request(`/tracks/playlists/${playlistId}/${trackId}`, { method: "POST" });
export const removeTrackFromPlaylist = async (playlistId: number, trackId: number) =>
  request(`/tracks/playlists/${playlistId}/${trackId}`, { method: "DELETE" });
export const removePlaylist = async (playlistId: number) =>
  request(`/tracks/playlists/${playlistId}`, { method: "DELETE" });

export const getMyTracks = async (): Promise<TrackWithPlaylist[]> => request(`/tracks/my-uploads`);
export const deleteTrack = async (trackId: number | string): Promise<{ success: boolean; message: string }> =>
  authFetch(`${getBaseUrl()}/tracks/${trackId}`, { method: 'DELETE' }).then(async res => {
    if (!res) throw new Error("Xác thực thất bại, không thể xóa bài hát.");
    if (!res.ok) {
      let errorMessage = `HTTP error ${res.status}`;
      try { const errData = await res.json(); errorMessage = errData.message || errorMessage; } catch {}
      throw new Error(errorMessage);
    }
    return res.json();
  });

// ====================== UPDATE TRACK ======================
// (keeps two-step approach but unchanged here; main fixes above)

const UPLOAD_CANDIDATES = [
  "/temp_uploads",
  "/tracks/upload",
  "/tracks/upload-artwork",
  "/tracks/temp-upload",
  "/upload",
  "/upload-file",
  "/uploads",
];

const makeFileForFormData = async (uri: string) => {
  if (!uri) throw new Error("Invalid uri");
  if (uri.startsWith("content://")) {
    const resp = await fetch(uri);
    if (!resp.ok) throw new Error(`Failed to fetch content URI: ${resp.status}`);
    const blob = await resp.blob();
    const type = blob.type || "image/jpeg";
    const ext = (type.split("/")[1] || "jpg").split("+")[0];
    const name = `artwork_${Date.now()}.${ext}`;
    return { uri, name, type } as any;
  }
  const normalized = uri.startsWith("file://") ? uri : uri;
  const name = normalized.split("/").pop() || `artwork_${Date.now()}.jpg`;
  const lower = name.toLowerCase();
  const type = lower.endsWith("png") ? "image/png" : lower.endsWith("webp") ? "image/webp" : "image/jpeg";
  return { uri: normalized, name, type } as any;
};

const tryUploadCandidates = async (baseUrl: string, form: FormData) => {
  const attempts: any[] = [];
  for (const path of UPLOAD_CANDIDATES) {
    const url = `${baseUrl}${path}`;
    try {
      console.log(`[trackService] trying upload endpoint: ${url}`);
      const res = await authFetch(url, { method: "POST", body: form });
      if (!res) {
        attempts.push({ url, ok: false, detail: "authFetch returned null" });
        continue;
      }
      const status = res.status;
      const text = await res.text().catch(() => "");
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      attempts.push({ url, ok: res.ok, status, text, json });
      if (res.ok) return { url, status, text, json };
    } catch (err: any) {
      console.warn(`[trackService] upload error for ${url}:`, err?.message || err);
      attempts.push({ url, ok: false, error: err?.message || String(err) });
    }
  }
  return { url: null, attempts };
};

export const updateTrack = async (
  trackId: number | string,
  title: string,
  artists: string,
  artworkUri?: string | null
): Promise<any> => {
  const baseUrl = getBaseUrl();

  const tryDirectPut = async (artworkLocalUri?: string | null) => {
    try {
      let artworkUriForPut = artworkLocalUri || null;

      if (artworkUriForPut) {
        try {
          const safeName = sanitizeFileName(artworkUriForPut, ".jpg");
          const dest = `${FileSystem.cacheDirectory}${safeName}`;
          if (artworkUriForPut !== dest && artworkUriForPut !== `file://${dest}`) {
            await FileSystem.copyAsync({ from: artworkUriForPut, to: dest });
          }
          artworkUriForPut = dest.startsWith("file://") ? dest : `file://${dest}`;
        } catch (copyErr) {
          console.warn("[trackService] copy to cache failed, continuing with original uri:", copyErr);
        }
      }

      const url = `${baseUrl}/tracks/${trackId}`;
      const formData = new FormData();
      formData.append("title", title);
      formData.append("artists", artists);

      if (artworkUriForPut) {
        const file = await makeFileForFormData(artworkUriForPut);
        formData.append("artworkFile", file as any);
      }

      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const res = await fetch(url, {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const text = await res.text();
      if (!res.ok) return { ok: false, status: res.status, text };
      try {
        const json = text ? JSON.parse(text) : null;
        return { ok: true, json, status: res.status, text };
      } catch {
        return { ok: true, text, status: res.status };
      }
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  };

  try {
    // 1) Try direct PUT multipart first
    const direct = await tryDirectPut(artworkUri || null);
    if (direct && direct.ok) {
      return direct.json ?? (direct.text ? JSON.parse(direct.text) : null);
    }

    // 2) Fallback: two-step upload then JSON PUT
    let artworkPathFromServer: string | undefined;

    if (artworkUri) {
      try {
        const info = await FileSystem.getInfoAsync(artworkUri);
        if (!info.exists) {
          const alt = artworkUri.replace(/^file:\/\//, "");
          const info2 = await FileSystem.getInfoAsync(alt);
          if (!info2.exists) throw new Error("Artwork file not accessible");
        }
      } catch (e) {
        throw new Error("Artwork file not accessible locally");
      }

      const form = new FormData();
      const fileForForm = await makeFileForFormData(artworkUri);
      form.append("artworkFile", fileForForm as any);

      const attempt = await tryUploadCandidates(baseUrl, form);
      if (!attempt || !attempt.url) {
        console.error("[trackService] upload attempts:", attempt.attempts || attempt);
        throw new Error(
          "Không tìm thấy endpoint upload hợp lệ trên server. Kiểm tra route upload phía backend (ví dụ /temp_uploads hoặc /tracks/upload)."
        );
      }

      const uploadJson = attempt.json;
      const uploadText = attempt.text;
      artworkPathFromServer =
        (uploadJson && (uploadJson.path || uploadJson.url || uploadJson.filePath)) ||
        (uploadJson && uploadJson.data && uploadJson.data.path) ||
        null;

      if (!artworkPathFromServer && uploadText && typeof uploadText === "string" && uploadText.trim()) {
        artworkPathFromServer = uploadText.trim();
      }

      if (!artworkPathFromServer) {
        throw new Error(
          `Upload thành công nhưng server không trả đường dẫn file. Response: ${JSON.stringify(uploadJson ?? uploadText)}`
        );
      }
    }

    // Update metadata via JSON PUT
    const updateUrl = `${baseUrl}/tracks/${trackId}`;
    const body: any = { title, artists };
    if (artworkPathFromServer) body.artwork = artworkPathFromServer;

    const res = await authFetch(updateUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res || !res.ok) {
      const text = res ? await res.text().catch(() => "") : "";
      throw new Error(text || `HTTP error ${res?.status}`);
    }

    return res.json();
  } catch (err: any) {
    console.error("[trackService] updateTrack error:", err);
    throw new Error(err?.message || String(err));
  }
};

// ====================== GENRES / HISTORY / RECOMMENDATIONS ======================
export const getExistingGenres = async (): Promise<string[]> => request(`/tracks/genres`);
export const updateTrackGenre = async (trackId: number | string, genre: string): Promise<{ message: string }> =>
  request(`/tracks/${trackId}/genre`, { method: "PATCH", body: JSON.stringify({ genre }) });

export const logPlayHistory = (trackId: number | string, isListened: 0 | 1) => {
  request(`/tracks/${trackId}/log-play`, { method: 'POST', body: JSON.stringify({ is_listened: isListened }) })
    .then(() => console.log(`[logPlayHistory] Track ${trackId} logged.`))
    .catch(error => console.error(`[logPlayHistory] Error track ${trackId}:`, error.message || error));
};

export const fetchRecommendations = async (): Promise<TrackWithPlaylist[]> => {
  try {
    const data = await request('/tracks/recommendations');
    return data as TrackWithPlaylist[];
  } catch (error) {
    console.error("Lỗi khi lấy nhạc gợi ý:", error);
    return [];
  }
};

// fetchTracksPaginated returns canonical shape { items, isLastPage }
export const fetchTracksPaginated = async (
  page: number,
  search: string = '',
  limit = 20
): Promise<{ items: TrackWithPlaylist[]; isLastPage: boolean }> => {
  try {
    const query = `page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
    const data = await request(`/tracks?${query}`);
    const items = (Array.isArray(data) ? data : data?.tracks || []) as TrackWithPlaylist[];
    const isLastPage = items.length < limit;
    return { items, isLastPage };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nhạc (phân trang):", error);
    return { items: [], isLastPage: true };
  }
};
