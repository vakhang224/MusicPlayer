// src/components/GenreInputModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView
} from 'react-native';
import { colors, fontSize } from '@/constants/token';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { getExistingGenres } from '@/services/trackService';

type GenreInputModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onSave: (genre: string) => Promise<void>;
};

export const GenreInputModal = ({ isVisible, onClose, onSave }: GenreInputModalProps) => {
  const { t } = useTranslation();
  const [genreInput, setGenreInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [existingGenres, setExistingGenres] = useState<string[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setGenreInput('');

      const fetchGenres = async () => {
        setIsLoadingGenres(true);
        try {
          const genres = await getExistingGenres();
          setExistingGenres(Array.isArray(genres) ? genres : []);
        } catch (error) {
          console.error("Error fetching genres:", error);
        } finally {
          setIsLoadingGenres(false);
        }
      };
      fetchGenres();
    }
  }, [isVisible]);

  const handleSave = async () => {
    if (!genreInput.trim()) {
      Toast.show({
        type: 'error',
        text1: t('common.missingInfoTitle'),
        text2: t('genreModal.genreRequired')
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(genreInput.trim());
    } catch (error) {
      console.error("Error saving genre (Modal):", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleSelectGenre = (selectedGenre: string) => {
    setGenreInput(selectedGenre);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('genreModal.title')}</Text>
          <Text style={styles.modalSubtitle}>{t('genreModal.subtitle')}</Text>

          <View style={styles.genreListContainer}>
            {isLoadingGenres ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {existingGenres.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genreTag,
                      genreInput === g && styles.genreTagSelected
                    ]}
                    onPress={() => handleSelectGenre(g)}
                  >
                    <Text
                      style={[
                        styles.genreTagText,
                        genreInput === g && styles.genreTagTextSelected
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <Text style={styles.orText}>{t('common.or')}</Text>

          <View style={styles.inputContainerModal}>
            <TextInput
              placeholder={t('genreModal.placeholder')}
              value={genreInput}
              onChangeText={setGenreInput}
              style={styles.inputModal}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.modalButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.skipButton]}
            onPress={handleClose}
            disabled={isSaving}
          >
            <Text style={styles.skipButtonText}>{t('common.skip')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    paddingBottom: 20,
    paddingTop: 25,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  genreListContainer: {
    height: 40,
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
    justifyContent: 'center'
  },
  genreTag: {
    backgroundColor: '#3A3A3C',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  genreTagSelected: {
    backgroundColor: colors.primary,
  },
  genreTagText: {
    color: colors.text,
    fontSize: fontSize.xs,
  },
  genreTagTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  orText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginBottom: 10,
  },
  inputContainerModal: {
    marginBottom: 15,
    width: '100%',
    paddingHorizontal: 20,
  },
  inputModal: {
    height: 44,
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: colors.text,
    fontSize: fontSize.sm,
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
    width: '90%',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderColor: colors.textMuted,
    borderWidth: 1,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  skipButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
