// src/app/(module)/settings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { colors, fontSize, screenPadding } from '@/constants/token';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { defaultStyles } from '@/styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { getBaseUrl } from '@/services/baseUrlManager';
import Toast from 'react-native-toast-message';

export const options = {
  headerShown: false,
};

const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const currentLang = i18n.language;
  const { user } = useAuth();
  const baseUrl = getBaseUrl();

  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeLanguage = (lang: 'en' | 'vi') => {
    i18n.changeLanguage(lang);
  };

  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPwModalVisible(true);
  };

  const closeChangePassword = () => {
    setPwModalVisible(false);
  };

  const showError = (title: string, message?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
    });
  };

  const showSuccess = (title: string, message?: string) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
    });
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showError(t('common.missingInfoTitle') || 'Error', t('settings.errors.passwordTooShort') || 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError(t('common.errorTitle') || 'Error', t('settings.errors.passwordMismatch') || 'Mật khẩu mới và xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error(t('settings.errors.noUser') || 'Không xác định user');

      const resp = await fetch(`${baseUrl}/users/${userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword: newPassword,
        }),
      });

      const contentType = resp.headers.get('content-type') || '';
      const text = await resp.text();
      let data: any = null;
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }
      }

      if (!resp.ok) {
        const msg = (data && (data.message || data.error)) || text || `HTTP ${resp.status}`;
        showError(t('common.errorTitle') || 'Error', msg);
        return;
      }

      showSuccess(t('common.successTitle') || 'Success', (data && data.message) || t('settings.success.passwordChanged') || 'Đổi mật khẩu thành công');
      closeChangePassword();
    } catch (err: any) {
      console.error('[Settings] change password error', err);
      showError(t('settings.errors.changeFailed') || 'Không thể đổi mật khẩu', err?.message || undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Language section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.selectLanguage')}</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.optionRow} onPress={() => handleChangeLanguage('en')}>
            <Text style={styles.optionText}>{t('settings.english')}</Text>
            <View style={styles.rightArea}>
              {currentLang === 'en' && <MaterialIcons name="check" size={24} color={colors.primary} />}
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.optionRow} onPress={() => handleChangeLanguage('vi')}>
            <Text style={styles.optionText}>{t('settings.vietnamese')}</Text>
            <View style={styles.rightArea}>
              {currentLang === 'vi' && <MaterialIcons name="check" size={24} color={colors.primary} />}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Security section: tapping the whole row opens the modal (no separate button) */}
      <View style={[styles.section, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>{t('settings.security') || 'Bảo mật'}</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.optionRow} onPress={openChangePassword} activeOpacity={0.7}>
            <Text style={styles.optionText}>{t('settings.changePassword') || 'Đổi mật khẩu'}</Text>
            <View style={styles.rightArea}>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Change password modal */}
      <Modal visible={pwModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('settings.changePassword') || 'Đổi mật khẩu'}</Text>

            <TextInput
              placeholder={t('settings.placeholders.currentPassword') || 'Mật khẩu hiện tại (nếu có)'}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
              autoCapitalize="none"
            />
            <TextInput
              placeholder={t('settings.placeholders.newPassword') || 'Mật khẩu mới'}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              autoCapitalize="none"
            />
            <TextInput
              placeholder={t('settings.placeholders.confirmNewPassword') || 'Xác nhận mật khẩu mới'}
              secureTextEntry
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              style={styles.input}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={closeChangePassword} disabled={loading}>
                <Text style={styles.modalBtnCancelText}>{t('common.cancel') || 'Hủy'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalBtnOk} onPress={handleChangePassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnOkText}>{t('common.save') || 'Lưu'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast component is expected to be rendered at app root (App.tsx or index.tsx) */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...defaultStyles.container,
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding.horizontal,
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: screenPadding.horizontal,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  optionText: {
    color: colors.text,
    fontSize: fontSize.base,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginHorizontal: 16,
  },

  rightArea: {
    marginLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 56,
  },

  /* Modal styles */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#0F0F10', borderRadius: 8, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: colors.text },
  input: { borderWidth: 1, borderColor: '#2A2A2C', borderRadius: 6, padding: 10, marginBottom: 10, color: colors.text },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  modalBtnCancel: { paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
  modalBtnCancelText: { color: colors.text },
  modalBtnOk: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  modalBtnOkText: { color: '#fff', fontWeight: '600' },
});

export default SettingsScreen;
