// src/components/EditTrackModal.tsx
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Image,
    TextInput, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { TrackWithPlaylist } from '@/helpers/type';
import { colors, fontSize } from '@/constants/token';
import { unknownTracksImageUri } from '@/constants/images';
import { getBaseUrl } from '@/services/baseUrlManager';

/**
 * EditTrackModal (no external mime dependency)
 *
 * Notes:
 * - If you manage auth token in context/store, replace getAuthToken() with your method.
 * - This version attempts to copy content:// URIs to cache so fetch can read them on Android.
 */

interface EditTrackModalProps {
    isVisible: boolean;
    track: TrackWithPlaylist | null;
    onClose: () => void;
    onSave?: (trackId: number | string, newTitle: string, newArtworkUri?: string | null) => Promise<void>;
}

function guessMimeTypeFromFilename(filename: string | undefined | null) {
    if (!filename) return 'image/jpeg';
    const lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.heic')) return 'image/heic';
    // default
    return 'image/jpeg';
}

export const EditTrackModal: React.FC<EditTrackModalProps> = ({ isVisible, track, onClose, onSave }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [newArtwork, setNewArtwork] = useState<{ uri: string, name: string } | null>(null);
    const [currentArtworkUri, setCurrentArtworkUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const baseUrl = getBaseUrl();

    useEffect(() => {
        if (!track) {
            setTitle('');
            setNewArtwork(null);
            setCurrentArtworkUri(unknownTracksImageUri);
            return;
        }

        setTitle(track.title || '');
        setNewArtwork(null);

        const raw = track.artwork || '';
        const token = (track as any)?._localImageReloadToken;

        if (!raw) {
            setCurrentArtworkUri(unknownTracksImageUri);
            return;
        }

        let resolved: string;
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
            resolved = token ? `${raw}${raw.includes('?') ? '&' : '?'}t=${token}` : raw;
        } else {
            const path = raw.startsWith('/') ? raw.substring(1) : raw;
            const base = `${baseUrl}/${path}`;
            resolved = token ? `${base}${base.includes('?') ? '&' : '?'}t=${token}` : base;
        }

        setCurrentArtworkUri(resolved);
    }, [track, baseUrl]);

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Toast.show({ type: 'error', text1: t('common.permissionDeniedTitle'), text2: t('common.mediaLibraryPermissionDenied') });
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const fileName = result.assets[0].fileName || `artwork_${Date.now()}.jpg`;
                const uri = result.assets[0].uri;
                setNewArtwork({ uri, name: fileName });
                setCurrentArtworkUri(uri);
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: t('common.errorTitle'), text2: t('editTrack.imagePickError') });
        }
    };

    const validateArtworkUriAccessible = async (uri: string) => {
        if (!uri) return false;
        try {
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists) return true;
            const noScheme = uri.replace(/^file:\/\//, '');
            const info2 = await FileSystem.getInfoAsync(noScheme);
            return !!info2.exists;
        } catch {
            return false;
        }
    };

    const defaultOnSave = async (trackId: number | string, newTitle: string, newArtworkUri?: string | null) => {
        // Replace this with how you retrieve the current auth token in your app
        const token = (global as any).__authToken || null;
        if (!token) throw new Error('No auth token available');

        const url = `${baseUrl}/tracks/${trackId}`;
        const fd: any = new FormData();
        fd.append('title', newTitle);

        if (newArtworkUri) {
            let usableUri = newArtworkUri;

            // If Android content:// or not file://, try copy to cache
            if (usableUri.startsWith('content://') || !usableUri.startsWith('file://')) {
                try {
                    // Guess extension from provided name or uri
                    const extFromName = newArtwork?.name?.split('.').pop();
                    const extGuess = extFromName || (usableUri.split('.').pop() || 'jpg').split('?')[0];
                    const cacheName = `edit-artwork-${Date.now()}.${extGuess}`;
                    const cachePath = `${FileSystem.cacheDirectory}${cacheName}`;

                    // Read as base64 if possible, otherwise attempt downloadAsync
                    const base64 = await FileSystem.readAsStringAsync(usableUri, { encoding: FileSystem.EncodingType.Base64 }).catch(async () => {
                        try {
                            await FileSystem.downloadAsync(usableUri, cachePath);
                            return null;
                        } catch {
                            return null;
                        }
                    });

                    if (base64) {
                        await FileSystem.writeAsStringAsync(cachePath, base64, { encoding: FileSystem.EncodingType.Base64 });
                        usableUri = cachePath;
                    } else {
                        // If downloadAsync wrote to cachePath, use it; otherwise fallback to original
                        usableUri = `${FileSystem.cacheDirectory}${cacheName}`;
                    }
                } catch (e) {
                    console.warn('[EditTrackModal] copy to cache failed, will try original uri', e);
                }
            }

            const filename = newArtwork?.name || usableUri.split('/').pop() || `art_${Date.now()}.jpg`;
            const type = guessMimeTypeFromFilename(filename);

            fd.append('artworkFile', {
                uri: usableUri,
                name: filename,
                type,
            } as any);
        }

        const resp = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                // do not set Content-Type
            },
            body: fd,
        }).catch((err) => {
            console.error('[EditTrackModal] network error', err);
            throw err;
        });

        if (!resp.ok) {
            const text = await resp.text().catch(() => null);
            try {
                const parsed = text ? JSON.parse(text) : null;
                throw new Error(parsed?.message || text || `HTTP ${resp.status}`);
            } catch (e) {
                throw new Error(text || `HTTP ${resp.status}`);
            }
        }

        const json = await resp.json();
        return json;
    };

    const handleInternalSave = async () => {
        if (!track) return;
        const trimmedTitle = title.trim();
        const titleChanged = trimmedTitle !== (track.title || '');
        const artworkChanged = !!newArtwork;

        if (!titleChanged && !artworkChanged) {
            Toast.show({ type: 'info', text1: t('common.infoTitle'), text2: t('editTrack.noChanges') });
            return;
        }

        if (!trimmedTitle) {
            Toast.show({ type: 'error', text1: t('common.errorTitle'), text2: t('editTrack.titleArtistRequired', 'Vui lòng nhập Tiêu đề.') });
            return;
        }

        if (artworkChanged) {
            const uri = newArtwork?.uri;
            console.log('[EditTrackModal] newArtwork.uri =', uri);
            if (!uri || (typeof uri === 'string' && !uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('/'))) {
                Toast.show({ type: 'error', text1: t('common.errorTitle'), text2: t('editTrack.imagePickError') });
                return;
            }
            const accessible = await validateArtworkUriAccessible(uri);
            if (!accessible) {
                Toast.show({ type: 'error', text1: t('common.errorTitle'), text2: t('editTrack.imageNotAccessible', 'Không thể truy cập file ảnh đã chọn.') });
                return;
            }
        }

        setIsSaving(true);
        try {
            if (typeof onSave === 'function') {
                await onSave(track.id, trimmedTitle, newArtwork?.uri);
            } else {
                await defaultOnSave(track.id, trimmedTitle, newArtwork?.uri);
            }
            onClose();
            Toast.show({ type: 'success', text1: t('common.successTitle'), text2: t('editTrack.saveSuccess', 'Cập nhật bài hát thành công') });
        } catch (error: any) {
            console.error("Error saving track:", error);
            Toast.show({ type: 'error', text1: t('common.errorTitle'), text2: String(error?.message || error) });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalContent, styles.editModalContent, { backgroundColor: '#1C1C1E' }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeModalButton}><Ionicons name="close" size={28} color={colors.textMuted} /></TouchableOpacity>
                    <Text style={styles.modalTitle}>{t('editTrack.screenTitle')}</Text>
                    <ScrollView>
                        <TouchableOpacity onPress={handlePickImage} style={styles.editImageContainer}>
                            <Image
                                key={currentArtworkUri ?? `${track?.id ?? 'no-track'}-art`}
                                source={{ uri: currentArtworkUri ?? unknownTracksImageUri }}
                                style={styles.editArtworkImage}
                            />
                            <View style={styles.editIconOverlayModal}><MaterialIcons name="edit" size={20} color="#FFF" /></View>
                        </TouchableOpacity>
                        <View style={styles.inputContainerModal}>
                            <Text style={styles.labelModal}>{t('editTrack.titleLabel')}</Text>
                            <TextInput value={title} onChangeText={setTitle} placeholder={t('editTrack.titlePlaceholder')} placeholderTextColor={colors.textMuted} style={styles.inputModal} />
                        </View>

                        <TouchableOpacity style={[styles.saveButtonModal, isSaving && styles.buttonDisabled]} onPress={handleInternalSave} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonTextModal}>{t('editTrack.saveButton')}</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)' },
    modalContent: { width: '90%', maxHeight: '85%', borderRadius: 12, paddingBottom: 10, paddingTop: 50, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10, overflow: 'hidden' },
    closeModalButton: { position: 'absolute', top: 12, right: 12, padding: 5, zIndex: 1 },
    modalTitle: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text, marginBottom: 15, textAlign: 'center', paddingHorizontal: 40 },
    buttonDisabled: { opacity: 0.5 },
    inputContainerModal: { marginBottom: 15, width: '100%', paddingHorizontal: 20 },
    labelModal: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: 5 },
    inputModal: { height: 44, backgroundColor: '#2C2C2E', borderColor: '#3A3A3C', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, color: colors.text, fontSize: fontSize.sm, width: '100%' },
    editModalContent: { maxHeight: '90%' },
    editImageContainer: { alignItems: 'center', marginBottom: 20, position: 'relative' },
    editArtworkImage: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#2C2C2E' },
    editIconOverlayModal: { position: 'absolute', bottom: 0, right: Platform.OS === 'ios' ? '35%' : '35%', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: 5, borderRadius: 12 },
    saveButtonModal: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 15, marginHorizontal: 20, marginBottom: 20 },
    saveButtonTextModal: { color: '#000', fontWeight: '700', fontSize: fontSize.sm },
});
