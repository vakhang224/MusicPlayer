// src/app/(module)/profile.tsx
import React, { useLayoutEffect, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Toast from "react-native-toast-message";
import { FontAwesome, MaterialCommunityIcons, Ionicons, MaterialIcons, FontAwesome6 } from "@expo/vector-icons";

import { getBaseUrl } from "@/services/baseUrlManager";
import unknownArtistImage from "@/assets/unknown_artist.png";
import { colors, fontSize, screenPadding } from "@/constants/token";
import { useAuth } from "@/context/AuthContext";
import {
  uploadTrack,
  getMyTracks,
  deleteTrack,
  updateTrack,
  updateTrackGenre,
} from "@/services/trackService";
import { uploadAvatar } from "@/services/authService";
import { useLibraryStore, useUpdateSingleTrack } from "@/store/library";
import { useQueue } from "@/store/queue";
import { TrackWithPlaylist, Track } from "@/helpers/type";
import { EditTrackModal } from "@/components/EditTrackModal";
import { MyUploadsModal } from "@/components/MyUploadsModal";
import { GenreInputModal } from "@/components/GenreInputModal";
import * as SecureStore from "expo-secure-store";
import { ACCESS_TOKEN_KEY } from "@/services/authService";

export const options = { header: () => null };

const ProfileScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { logout, user, isLoading: isAuthLoading, updateCurrentUser } = useAuth();

  const refreshLibraryTracks = useLibraryStore((state) => state.refreshTracks);
  const updateSingleTrackInStore = useUpdateSingleTrack();
  const queueStore = useQueue();

  // --- State ---
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [artworkFile, setArtworkFile] = useState<{ uri: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [myTracks, setMyTracks] = useState<TrackWithPlaylist[]>([]);
  const [isLoadingMyTracks, setIsLoadingMyTracks] = useState(false);
  const [isRefreshingMyTracks, setIsRefreshingMyTracks] = useState(false);

  const [isMyUploadsModalVisible, setIsMyUploadsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [trackToEdit, setTrackToEdit] = useState<TrackWithPlaylist | null>(null);

  const [isGenreModalVisible, setIsGenreModalVisible] = useState(false);
  const [trackAwaitingGenre, setTrackAwaitingGenre] = useState<Track | null>(null);

  // --- Fetch my tracks ---
  const fetchMyTracks = useCallback(
    async (showLoading = true) => {
      if (showLoading && !isRefreshingMyTracks) setIsLoadingMyTracks(true);
      try {
        const tracks = await getMyTracks();
        setMyTracks(tracks);
      } catch (err) {
        const msg = (err as any)?.message || String(err);
        Toast.show({
          type: "error",
          text1: t("common.errorTitle"),
          text2: t("myUploads.fetchError", { message: msg }),
        });
        setMyTracks([]);
      } finally {
        setIsLoadingMyTracks(false);
        setIsRefreshingMyTracks(false);
      }
    },
    [isRefreshingMyTracks, t]
  );

  useEffect(() => {
    if (isMyUploadsModalVisible) fetchMyTracks(true);
  }, [isMyUploadsModalVisible, fetchMyTracks]);

  const onRefreshMyTracks = useCallback(() => {
    setIsRefreshingMyTracks(true);
    fetchMyTracks(false);
  }, [fetchMyTracks]);

  // --- Layout ---
  useLayoutEffect(() => {
    if (navigation && (navigation as any).setOptions) {
      try {
        (navigation as any).setOptions({ headerShown: false });
      } catch (e) {
        console.warn("Could not set headerShown", e);
      }
    }
  }, [navigation]);

  // --- Handlers ---
  const handleLogout = async () => {
    await logout();
    Toast.show({
      type: "success",
      text1: t("profile.toast.logoutSuccess"),
      text2: t("profile.toast.logoutSuccessMessage"),
      visibilityTime: 3000,
    });
  };

  const pickAudio = async () => {
    try {
      const result: any = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      // new shape
      if (result && result.canceled === false && Array.isArray(result.assets) && result.assets.length > 0) {
        const asset = result.assets[0];
        setAudioFile({
          uri: asset.uri,
          name: asset.name || asset.fileName || `audio_${Date.now()}.mp3`,
          mimeType: asset.mimeType,
        });
        return;
      }

      // legacy shape
      if (result && (result.type === "success" || result.type === "finished")) {
        const uri = result.uri || result.file;
        const name = result.name || result.fileName || `audio_${Date.now()}.mp3`;
        if (uri) {
          setAudioFile({ uri, name });
          return;
        }
      }

      // fallback
      if (result && result.uri) {
        setAudioFile({ uri: result.uri, name: result.name || `audio_${Date.now()}.mp3` });
        return;
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t("common.errorTitle"),
        text2: t("profile.upload.audioPickError"),
      });
    }
  };

  const pickArtwork = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileName = result.assets[0].fileName || `artwork_${Date.now()}.jpg`;
        setArtworkFile({ uri: result.assets[0].uri, name: fileName });
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t("common.errorTitle"),
        text2: t("profile.upload.imagePickError"),
      });
    }
  };

  const handlePickAndUploadAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Toast.show({
          type: "error",
          text1: t("common.permissionDeniedTitle"),
          text2: t("common.mediaLibraryPermissionDenied"),
        });
        setIsUploadingAvatar(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsUploadingAvatar(false);
        return;
      }

      const avatarUri = result.assets[0].uri;
      const uploadResponse = await uploadAvatar(avatarUri);

      if (uploadResponse && uploadResponse.avatarUrl) {
        const baseUrl = getBaseUrl();
        let relativePath = uploadResponse.avatarUrl;
        if (relativePath.startsWith(baseUrl)) {
          relativePath = relativePath.substring(baseUrl.length);
          if (relativePath.startsWith("/")) relativePath = relativePath.substring(1);
        }
        updateCurrentUser({ avatar: relativePath });
        Toast.show({
          type: "success",
          text1: t("common.successTitle"),
          text2: t("profile.avatar.updateSuccess"),
        });
      } else {
        throw new Error(t("profile.avatar.invalidResponse"));
      }
    } catch (err) {
      const msg = (err as any)?.message || String(err);
      Toast.show({
        type: "error",
        text1: t("common.errorTitle"),
        text2: msg || t("profile.avatar.updateFailed"),
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const resetUploadForm = () => {
    setTitle("");
    setAudioFile(null);
    setArtworkFile(null);
  };

  const handleUpload = async () => {
    if (!audioFile) {
      Toast.show({
        type: "error",
        text1: t("common.missingInfoTitle"),
        text2: t("profile.upload.audioRequiredError"),
      });
      return;
    }
    if (!title.trim()) {
      Toast.show({
        type: "error",
        text1: t("common.missingInfoTitle"),
        text2: t("profile.upload.trackNamePlaceholder"),
      });
      return;
    }

    const artistName = user?.name || user?.username || "Unknown Artist";
    setIsUploading(true);

    try {
      const response = await uploadTrack(
        title.trim(),
        artistName,
        audioFile.uri,
        artworkFile?.uri
      );

      if (response.status === "complete") {
        Toast.show({
          type: "success",
          text1: t("common.successTitle"),
          text2: t("profile.upload.successMessage", {
            title: response.track?.title || title,
            verified: t("profile.upload.notVerified"),
          }),
          visibilityTime: 4000,
        });
        setIsUploadModalVisible(false);
        resetUploadForm();
        await refreshLibraryTracks();
      } else if (response.status === "genre_required") {
        setTrackAwaitingGenre(response.track);
        setIsGenreModalVisible(true);
        Toast.show({
          type: "info",
          text1: t("profile.upload.step2Title", "Cần Thêm Thông Tin"),
          text2: t(
            "profile.upload.genreRequiredMessage",
            "Bài hát đã được tải lên, vui lòng thêm thể loại."
          ),
        });
      } else {
        throw new Error(response.message || "Lỗi không xác định từ server");
      }
    } catch (err) {
      const msg = (err as any)?.message || String(err);
      Toast.show({
        type: "error",
        text1: t("common.errorTitle"),
        text2: t("profile.upload.uploadFailed", { message: msg }),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveGenre = async (genre: string) => {
    if (!trackAwaitingGenre) return;
    try {
      await updateTrackGenre(trackAwaitingGenre.id, genre);
      Toast.show({
        type: "success",
        text1: t("common.successTitle"),
        text2: t("genreModal.saveSuccess", { title: trackAwaitingGenre.title }),
      });
      setIsGenreModalVisible(false);
      setIsUploadModalVisible(false);
      resetUploadForm();
      setTrackAwaitingGenre(null);
      await refreshLibraryTracks();
    } catch (err) {
      const msg = (err as any)?.message || String(err);
      Toast.show({
        type: "error",
        text1: t("common.errorTitle"),
        text2: msg || t("genreModal.saveError", "Lỗi lưu thể loại"),
      });
      throw err;
    }
  };

  const handleCloseGenreModal = async () => {
    setIsGenreModalVisible(false);
    setIsUploadModalVisible(false);
    resetUploadForm();
    setTrackAwaitingGenre(null);
    await refreshLibraryTracks();
  };

  const handlePlayTrackFromModal = (track: TrackWithPlaylist, tracks: TrackWithPlaylist[]) => {
    if (typeof queueStore.initializeQueue === "function") {
      const trackIndex = tracks.findIndex((t) => t.id === track.id);
      if (trackIndex !== -1) queueStore.initializeQueue(tracks, trackIndex);
      else queueStore.initializeQueue([track], 0);
      setIsMyUploadsModalVisible(false);
      router.navigate("/player");
    } else {
      Toast.show({ type: "error", text1: t("common.errorTitle"), text2: "Lỗi Player" });
    }
  };

  const handleOpenEditModal = (track: TrackWithPlaylist) => {
    setTrackToEdit(track);
    setIsEditModalVisible(true);
  };

  // --- Robust uploader using Expo FileSystem.uploadAsync (multipart) with retries ---
  async function uploadTrackWithFile(
    trackId: number | string,
    titleParam: string,
    artworkUri: string | null | undefined,
    token: string | null,
    baseUrl: string
  ) {
    if (!token) throw new Error("No auth token");
    const endpoint = `${baseUrl}/tracks/${trackId}`;

    async function ensureUsableFile(uri?: string | null): Promise<string> {
      if (!uri) return "";
      try {
        // file:// already usable
        if (uri.startsWith("file://")) {
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists) return uri;
        }

        // try to read base64 and write to cache
        const ext = (uri.split(".").pop() || "jpg").split("?")[0];
        const cacheName = `edit-art-${Date.now()}.${ext}`;
        const cachePath = `${FileSystem.cacheDirectory}${cacheName}`;

        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }).catch(() => null);
        if (base64) {
          await FileSystem.writeAsStringAsync(cachePath, base64, { encoding: FileSystem.EncodingType.Base64 });
          return cachePath;
        }

        // fallback: downloadAsync
        await FileSystem.downloadAsync(uri, cachePath).catch(() => { });
        const info2 = await FileSystem.getInfoAsync(cachePath);
        if (info2.exists) return cachePath;
      } catch (e) {
        console.warn("[ensureUsableFile] failed", e);
      }
      return uri || "";
    }

    async function attempt() {
      // no file: simple JSON PUT
      if (!artworkUri) {
        const resp = await fetch(endpoint, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: titleParam }),
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => null);
          throw new Error(txt || `HTTP ${resp.status}`);
        }
        return resp.json();
      }

      const usableUri = await ensureUsableFile(artworkUri);
      if (!usableUri) throw new Error("Artwork file not accessible");

      const info = await FileSystem.getInfoAsync(usableUri).catch(() => null);
      if (!info || !info.exists) throw new Error("Artwork file not accessible");

      const fileFieldName = "artworkFile";
      const options: any = {
        fieldName: fileFieldName,
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        parameters: { title: titleParam },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const res = await FileSystem.uploadAsync(endpoint, usableUri, options);
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Upload failed ${res.status} - ${res.body || ""}`);
      }
      return JSON.parse(res.body);
    }

    let lastErr: any = null;
    for (let i = 0; i < 3; i++) {
      try {
        return await attempt();
      } catch (e) {
        lastErr = e;
        console.warn(`[uploadTrackWithFile] attempt ${i + 1} failed:`, (e as any)?.message || e);
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }
    throw lastErr || new Error("Upload failed after retries");
  }

  const buildFullArtworkUrl = (artwork?: string | undefined) => {
    if (!artwork) return undefined;
    const base = getBaseUrl();
    if (artwork.startsWith("http://") || artwork.startsWith("https://")) return artwork;
    return `${base}/${(artwork as string).replace(/^\/+/, "")}`;
  };

  // Replace previous direct PUT / fallback logic: use robust uploader when artwork file is present.
  const handleSaveChanges = async (
    trackId: number | string,
    newTitle: string,
    newArtworkUri?: string | null
  ) => {
    const artistName = user?.name || user?.username || "Unknown Artist";
    try {
      // First try a robust native upload if artworkUri exists, otherwise fallback to existing updateTrack
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const baseUrl = getBaseUrl();

      if (newArtworkUri) {
        try {
          // debug info
          const infoBefore = await FileSystem.getInfoAsync(newArtworkUri).catch(() => null);
          console.log("[Profile] artwork file info before upload:", infoBefore);

          const result = await uploadTrackWithFile(trackId, newTitle, newArtworkUri, token, baseUrl);

          if (result && result.track) {
            const serverTrack = result.track;
            const artworkUrl = buildFullArtworkUrl(serverTrack.artwork || serverTrack.path || serverTrack.url);
            const appliedTrack: any = { ...serverTrack, artwork: artworkUrl };
            appliedTrack._localImageReloadToken = Date.now();
            updateSingleTrackInStore(appliedTrack);
            setTrackToEdit(appliedTrack);
            setTimeout(() => fetchMyTracks(false), 300);
            Toast.show({
              type: "success",
              text1: t("common.successTitle"),
              text2: t("editTrack.updateSuccess", { title: newTitle }),
            });
            return;
          } else {
            const minimal: any = { id: trackId, title: newTitle, artwork: buildFullArtworkUrl(newArtworkUri) || newArtworkUri };
            minimal._localImageReloadToken = Date.now();
            updateSingleTrackInStore(minimal);
            setTrackToEdit(minimal);
            setTimeout(() => fetchMyTracks(false), 300);
            Toast.show({
              type: "success",
              text1: t("common.successTitle"),
              text2: t("editTrack.updateSuccess", { title: newTitle }),
            });
            return;
          }
        } catch (uploadErr) {
          console.warn("[Profile] uploadTrackWithFile failed, falling back to updateTrack:", (uploadErr as any)?.message || uploadErr);
          // proceed to fallback below
        }
      }

      // Fallback: authFetch updateTrack (server-handled without file)
      const response = await updateTrack(trackId, newTitle, artistName, newArtworkUri || undefined);

      console.log("[Profile] updateTrack response:", response);

      if (response && response.track) {
        const serverTrack = response.track;
        const artworkUrl = buildFullArtworkUrl(serverTrack.artwork || serverTrack.path || serverTrack.url);
        const appliedTrack: any = { ...serverTrack, artwork: artworkUrl };
        appliedTrack._localImageReloadToken = Date.now();
        updateSingleTrackInStore(appliedTrack);
        setTrackToEdit(appliedTrack);
        setTimeout(() => fetchMyTracks(false), 300);
        Toast.show({
          type: "success",
          text1: t("common.successTitle"),
          text2: t("editTrack.updateSuccess", { title: newTitle }),
        });
      } else {
        console.warn("[Profile] updateTrack did not include response.track — applying fallback update to store");
        const artworkValue =
          (response && (response.artwork || response.path || response.url)) ||
          newArtworkUri ||
          undefined;

        const updatedTrackFallback: any = {
          id: trackId,
          title: newTitle,
          artwork: artworkValue,
          _localImageReloadToken: Date.now(),
        };

        updateSingleTrackInStore(updatedTrackFallback);
        setTrackToEdit(updatedTrackFallback);
        setTimeout(() => fetchMyTracks(false), 300);

        Toast.show({
          type: "success",
          text1: t("common.successTitle"),
          text2: t("editTrack.updateSuccess", { title: newTitle }),
        });
      }
    } catch (err) {
      const msg = (err as any)?.message || String(err);
      console.error("[Profile] updateTrack error:", err);
      Toast.show({
        type: "error",
        text1: t("common.errorTitle"),
        text2: t("editTrack.updateError", { message: msg }),
      });
      return;
    }
  };

  const handleDeleteTrack = (track: TrackWithPlaylist) => {
    Alert.alert(
      t("myUploads.deleteConfirmTitle"),
      t("myUploads.deleteConfirmMessage", { title: track.title ?? "Unknown Title" }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            setIsLoadingMyTracks(true);
            try {
              await deleteTrack(track.id);
              fetchMyTracks(false);
              refreshLibraryTracks();
              Toast.show({
                type: "success",
                text1: t("common.successTitle"),
                text2: t("myUploads.deleteSuccess", { title: track.title ?? "Unknown Title" }),
              });
            } catch (err) {
              const msg = (err as any)?.message || String(err);
              Toast.show({
                type: "error",
                text1: t("common.errorTitle"),
                text2: t("myUploads.deleteError", { message: msg }),
              });
              setIsLoadingMyTracks(false);
            }
          },
        },
      ]
    );
  };

  // --- Render ---
  if (isAuthLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("profile.loading")}</Text>
      </View>
    );

  if (!user)
    return (
      <View style={styles.center}>
        <Text style={styles.noUserText}>{t("profile.noUser")}</Text>
      </View>
    );

  const baseUrl = getBaseUrl();

  // flexible verification check: accepts 1, true, "1", "true"
  const isVerifiedFlag =
    user &&
    (user.isVerified === 1 ||
      String(user.isVerified) === "1" ||
      String(user.isVerified).toLowerCase() === "true");

  return (
    <View style={styles.containerFlex}>
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickAndUploadAvatar} disabled={isUploadingAvatar}>
            <Image
              source={
                user.avatar && !user.avatar.endsWith("null")
                  ? { uri: `${baseUrl}/${user.avatar}` }
                  : unknownArtistImage
              }
              style={styles.avatar}
            />
            {isUploadingAvatar && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.name}>{user.name || user.username}</Text>
              {isVerifiedFlag && (
                <MaterialIcons
                  name="verified"
                  size={16}
                  color={colors.primary}
                  style={{ marginLeft: 6 }}
                  accessibilityLabel="verified"
                />
              )}
            </View>
            {/* If you want to keep the small verified text below name, uncomment next line:
                {isVerifiedFlag && <Text style={styles.verifiedText}>{t("profile.verifiedArtist")}</Text>}
            */}
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <FontAwesome name="user-o" size={16} color={colors.text} />
              <Text style={styles.infoText}>{t("profile.usernameLabel")}</Text>
            </View>
            <Text style={styles.infoValue}>{user.username}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialCommunityIcons name="email-outline" size={18} color={colors.text} />
              <Text style={styles.infoText}>{t("profile.emailLabel")}</Text>
            </View>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </View>

        {/* Menu Buttons */}
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push("/settings")}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
            <Text style={styles.infoText}>{t("profile.settingsButton")}</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMyUploadsModalVisible(true)}>
          <View style={styles.infoLabelContainer}>
            <MaterialIcons name="library-music" size={20} color={colors.text} />
            <Text style={styles.infoText}>{t("profile.myUploadsButton")}</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={() => setIsUploadModalVisible(true)}>
          <View style={styles.infoLabelContainer}>
            <MaterialIcons name="file-upload" size={20} color={colors.text} />
            <Text style={styles.infoText}>{t("profile.upload.addButton")}</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t("profile.logoutButton")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Upload Modal */}
      <Modal animationType="fade" transparent visible={isUploadModalVisible} onRequestClose={() => setIsUploadModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setIsUploadModalVisible(false)} style={styles.closeModalButton}>
              <Ionicons name="close" size={28} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("profile.upload.title")}</Text>
            <View style={styles.inputContainerModal}>
              <TextInput
                placeholder={t("profile.upload.trackNamePlaceholder")}
                value={title}
                onChangeText={setTitle}
                style={styles.inputModal}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={pickAudio}>
              <MaterialIcons name="audio-file" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.modalButtonText}>
                {audioFile ? `✓ ${audioFile.name}` : t("profile.upload.pickAudio")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={pickArtwork}>
              <MaterialIcons name="image" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.modalButtonText}>
                {artworkFile ? `✓ ${artworkFile.name}` : t("profile.upload.pickImage")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.uploadSubmitButton, isUploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.modalButtonText}>{t("profile.upload.uploadButton")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Other Modals */}
      <MyUploadsModal
        isVisible={isMyUploadsModalVisible}
        tracks={myTracks}
        isLoading={isLoadingMyTracks}
        isRefreshing={isRefreshingMyTracks}
        onClose={() => setIsMyUploadsModalVisible(false)}
        onEditTrack={handleOpenEditModal}
        onPlayTrack={handlePlayTrackFromModal}
        onRefresh={onRefreshMyTracks}
        onDeleteTrack={handleDeleteTrack}
      />

      <EditTrackModal
        isVisible={isEditModalVisible}
        track={trackToEdit}
        onClose={() => {
          setIsEditModalVisible(false);
          setTrackToEdit(null);
        }}
        onSave={handleSaveChanges}
      />

      <GenreInputModal
        isVisible={isGenreModalVisible}
        onClose={handleCloseGenreModal}
        onSave={handleSaveGenre}
      />
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  containerFlex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: screenPadding.horizontal },
  backButton: { position: "absolute", top: 50, left: screenPadding.horizontal - 5, zIndex: 10, padding: 5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  loadingText: { color: colors.text, marginTop: 10 },
  noUserText: { color: colors.textMuted },
  header: { flexDirection: "row", alignItems: "center", paddingVertical: 8, marginTop: 100 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.primary },
  avatarLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
  },
  userInfo: { marginLeft: 24, justifyContent: "center" },
  name: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  verifiedText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: "600", marginTop: 4 },
  infoBox: { marginTop: 24, backgroundColor: "#1C1C1E", borderRadius: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16 },
  infoLabelContainer: { flexDirection: "row", alignItems: "center" },
  infoText: { color: colors.text, fontSize: fontSize.sm, marginLeft: 10 },
  infoValue: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" },
  divider: { height: 1, backgroundColor: colors.background, marginHorizontal: 16 },
  logoutBtn: { marginTop: 32, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center", marginBottom: 48 },
  logoutText: { color: "#000", fontWeight: "700", fontSize: fontSize.base },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.8)" },
  modalContent: { width: "90%", maxHeight: "85%", borderRadius: 12, paddingBottom: 10, paddingTop: 50, position: "relative", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10, overflow: "hidden", backgroundColor: "#1C1C1E" },
  closeModalButton: { position: "absolute", top: 12, right: 12, padding: 5, zIndex: 1 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "bold", color: colors.text, marginBottom: 15, textAlign: "center", paddingHorizontal: 40 },
  inputContainerModal: { marginBottom: 15, width: "100%", paddingHorizontal: 20 },
  inputModal: { height: 44, backgroundColor: "#2C2C2E", borderColor: "#3A3A3C", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, color: colors.text, fontSize: fontSize.sm, width: "100%" },
  modalButton: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 8, marginHorizontal: 20 },
  modalButtonText: { color: "#000", fontWeight: "700", fontSize: fontSize.sm, paddingHorizontal: 10, flexShrink: 1 },
  uploadSubmitButton: { marginTop: 15, marginBottom: 20 },
  buttonDisabled: { opacity: 0.5 },
  menuButton: { marginTop: 16, backgroundColor: "#1C1C1E", borderRadius: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16 },
});

export default ProfileScreen;
