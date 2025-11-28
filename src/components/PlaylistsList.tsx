import { playlistNameFilter } from "@/helpers/trackPlayerFilter"
import { Playlist } from "@/helpers/type"
import { navigationSearch } from "@/hooks/navigationSearch"
import { utilsStyles } from "@/styles"
import React, { useMemo, useState } from "react"
import {
  Button,
  FlatList,
  FlatListProps,
  Text,
  View,
  Alert,
  Platform,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native"
import { PlaylistsListItem } from "./PlayListsListItem"
import { usePlaylists } from "@/store/library"
import { Swipeable } from "react-native-gesture-handler"
import Entypo from '@expo/vector-icons/Entypo';
import { useTranslation } from 'react-i18next'; 

type PlaylistsListProps = {
  playlists: Playlist[]
  onPlaylistPress: (playlist: Playlist) => void
} & Partial<FlatListProps<Playlist>>

const ItemDivider = () => (
  <View
    style={{
      ...utilsStyles.itemSeparator,
      marginLeft: 80,
      marginVertical: 12,
    }}
  />
)

export const PlaylistsList = ({
  playlists = [],
  onPlaylistPress,
  ...flatListProps
}: PlaylistsListProps) => {
  const { t } = useTranslation(); 
  const { search } = navigationSearch({})
  const { createPlaylist, deletePlaylist } = usePlaylists()


  const [modalVisible, setModalVisible] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")

  const filteredPlaylists = useMemo(() => {
    return playlists.filter(playlistNameFilter(search))
  }, [playlists, search])

  // 🔹 Hàm mở popup nhập tên playlist
  const handleAddPlaylist = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        t('playlist.newPlaylistTitle'),
        t('playlist.newPlaylistPrompt'),
        [
          { text: t('common.cancel'), style: "cancel" },
          {
            text: t('common.create'),
            onPress: (name) => {
              if (name && name.trim().length > 0) {
                createPlaylist(name.trim())
              }
            },
          },
        ],
        "plain-text"
      )
    } else {
      setModalVisible(true)
    }
  }

  // 🔹 Xử lý confirm trong Android Modal
  const handleConfirmCreate = () => {
    if (newPlaylistName.trim().length > 0) {
      createPlaylist(newPlaylistName.trim())
    }
    setNewPlaylistName("")
    setModalVisible(false)
  }

  // 🔹 Hàm render nút Delete khi swipe
  const renderRightActions = (playlist: Playlist) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => {
        Alert.alert(
          t('playlist.deleteTitle'),
          t('playlist.deleteMessage', { name: playlist.name }), // Dùng biến {{name}}
          [
            { text: t('common.cancel'), style: "cancel" },
            {
              text: t('playlist.deleteButton'),
              style: "destructive",
              onPress: async () => {
                try {
                  await deletePlaylist(playlist.id) 
                  console.log("✅ Deleted playlist:", playlist.id)
                } catch (err) {
                  console.error("❌ Delete playlist lỗi:", err)
                }
              },
            },
          ]
        )
      }}
    >
      <Text style={styles.deleteText}>{t('playlist.deleteButton')}</Text>
    </TouchableOpacity>
  )

  return (
    <>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <TouchableOpacity style={styles.addPlaylistButton} onPress={handleAddPlaylist}>
          <Entypo name="add-to-list" size={24} color="white" />
          <Text style={{ color: "white", fontSize: 16 }}>{t('playlist.addPlaylistButton')}</Text>
        </TouchableOpacity>
      </View>
      
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('playlist.newPlaylistTitle')}</Text>
            <TextInput
              placeholder={t('playlist.placeholder')}
              placeholderTextColor="#888"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              style={styles.input}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.button, styles.cancel]}
              >
                <Text style={styles.buttonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmCreate}
                style={[styles.button, styles.confirm]}
              >
                {/* <<< SỬA 1: Đổi style của chữ >>> */}
                <Text style={[styles.buttonText, styles.confirmButtonText]}>
                  {t('common.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 128 }}
        data={filteredPlaylists}
        ListFooterComponent={ItemDivider}
        ItemSeparatorComponent={ItemDivider}
        ListEmptyComponent={
          <View>
            <Text style={utilsStyles.emptyContentText}>{t('playlist.emptyList')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Swipeable renderRightActions={() => renderRightActions(item)}>
            <PlaylistsListItem
              playlist={item}
              onPress={() => onPlaylistPress(item)}
            />
          </Swipeable>
        )}
        {...flatListProps}
      />
    </>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#222",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    color: "#fff",
    backgroundColor: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 10,
    backgroundColor: "#4caf50"
  },
  cancel: {
    backgroundColor: "#555",
  },
  // <<< SỬA 2: Đổi màu nền nút "Create" >>>
  confirm: {
    backgroundColor: "#05fae5", // Màu chủ đạo
  },
  // Style chữ cho nút "Cancel"
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  // <<< THÊM 3: Style chữ (màu đen) cho nút "Create" >>>
  confirmButtonText: {
    color: "#000",
  },
  deleteButton: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginVertical: 5,
    borderRadius: 8,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  addPlaylistButton: {
    flexDirection: "row",
    justifyContent: "center", 
    alignItems: "center", 
    columnGap: 8, 
    
    backgroundColor: "#1d1d1c",
    height: 40,
    paddingHorizontal: 15, 
    borderRadius: 8,
    margin: 10,
    marginTop: 0,
  }
})