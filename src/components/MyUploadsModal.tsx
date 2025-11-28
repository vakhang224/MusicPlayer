// src/components/MyUploadsModal.tsx
import React from 'react';
import {
    View, Text, StyleSheet, Modal, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert // Thêm Alert nếu dùng onDeleteTrack ở đây (nhưng đã chuyển ra ngoài)
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { TrackWithPlaylist } from '@/helpers/type';
import { colors, fontSize, screenPadding } from '@/constants/token';
import TracksListItem from './TracksListItem'; // Import TracksListItem (default export)

interface MyUploadsModalProps {
    isVisible: boolean;
    tracks: TrackWithPlaylist[];
    isLoading: boolean;
    isRefreshing: boolean;
    onClose: () => void;
    onEditTrack: (track: TrackWithPlaylist) => void;
    onPlayTrack: (track: TrackWithPlaylist, tracks: TrackWithPlaylist[]) => void;
    onRefresh: () => void;
    onDeleteTrack: (track: TrackWithPlaylist) => void; // Parent handles confirmation and API call
}

export const MyUploadsModal: React.FC<MyUploadsModalProps> = ({
    isVisible, tracks, isLoading, isRefreshing, onClose, onEditTrack, onPlayTrack, onRefresh, onDeleteTrack
}) => {
    const { t } = useTranslation();

    const handlePlay = (track: TrackWithPlaylist) => { onPlayTrack(track, tracks); };

    // Simply call the onDeleteTrack prop passed from the parent
    const handleDelete = (track: TrackWithPlaylist) => { onDeleteTrack(track); };

    return (
        <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalContent, styles.myUploadsModalContent, { backgroundColor: '#1C1C1E' }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeModalButton}><Ionicons name="close" size={28} color={colors.textMuted} /></TouchableOpacity>
                    <Text style={styles.modalTitle}>{t('myUploads.screenTitle')}</Text>
                    {isLoading && !isRefreshing ? (
                        <View style={styles.centerModal}><ActivityIndicator size="large" color={colors.primary} /></View>
                    ) : tracks.length === 0 ? (
                        <View style={styles.centerModal}><Text style={styles.emptyMyUploadsText}>{t('myUploads.emptyList')}</Text></View>
                    ) : (
                        <FlatList
                            data={tracks}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.myUploadsListContainer}
                            ItemSeparatorComponent={() => <View style={styles.listSeparatorModal} />}
                            refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} /> }
                            renderItem={({ item }) => (
                                <View style={styles.myTracksRowModal}>
                                    <View style={styles.trackItemWrapperModal}>
                                        <TracksListItem
                                            track={item}
                                            onTrackSelected={handlePlay}
                                            hideMenu={true} // Hide the 3-dot menu
                                        />
                                    </View>
                                    <View style={styles.actionsContainerModal}>
                                        <TouchableOpacity onPress={() => onEditTrack(item)} style={styles.actionButtonModal}><MaterialIcons name="edit" size={20} color={colors.icon} /></TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButtonModal}><MaterialIcons name="delete" size={20} color={'#FF6347'} /></TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

// --- STYLES (Copied from profile.tsx, adjust if needed) ---
const styles = StyleSheet.create({
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)' },
    modalContent: { width: '90%', maxHeight: '85%', borderRadius: 12, paddingBottom: 10, paddingTop: 50, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10, overflow: 'hidden' },
    closeModalButton: { position: 'absolute', top: 12, right: 12, padding: 5, zIndex: 1 },
    modalTitle: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text, marginBottom: 15, textAlign: 'center', paddingHorizontal: 40 },
    centerModal: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    myUploadsModalContent: { height: '85%', maxHeight: '85%', paddingHorizontal: 0 },
    myUploadsListContainer: { paddingBottom: 20 },
    myTracksRowModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 20 },
    trackItemWrapperModal: { flex: 1, marginRight: 8 },
    actionsContainerModal: { flexDirection: 'row', alignItems: 'center' },
    actionButtonModal: { padding: 6, marginLeft: 6 },
    listSeparatorModal: { height: 1, backgroundColor: '#3A3A3C', marginVertical: 4, marginHorizontal: 20 },
    emptyMyUploadsText: { color: colors.textMuted, textAlign: 'center', fontSize: fontSize.base },
});

// export default MyUploadsModal; // Use named export if preferred