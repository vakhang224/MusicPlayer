import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { requestPasswordReset, resetPassword } from "@/services/authService";
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

interface ForgotPasswordProps {
  onDone?: () => void;
}

const ForgotPasswordModule: React.FC<ForgotPasswordProps> = ({ onDone }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sending, setSending] = useState(false);

  const handleRequestReset = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: t('common.errorTitle'),
        text2: t('forgotPassword.toast.enterEmail')
      });
      return;
    }
    try {
      setSending(true);
      console.log("📩 Gửi yêu cầu reset mật khẩu với email:", email);
      const res = await requestPasswordReset(email);
      console.log("🔍 Kết quả trả về từ API /forgot-password:", res);
      Toast.show({
        type: 'success',
        text1: t('forgotPassword.toast.codeSentSuccess'),
        text2: t('forgotPassword.toast.codeSentSuccessMessage')
      });
    } catch (err: any) {
      console.error("❌ Lỗi trong handleRequestReset:", err);
      Toast.show({
        type: 'error',
        text1: t('common.errorTitle'),
        text2: err.message || t('forgotPassword.toast.codeSentFailed')
      });
    } finally {
      setSending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !code || !newPassword) {
      Toast.show({
        type: 'error',
        text1: t('common.missingInfoTitle'),
        text2: t('forgotPassword.toast.missingInfo')
      });
      return;
    }
    try {
      console.log("🔐 Gửi yêu cầu reset mật khẩu:", { email, code, newPassword });
      const res = await resetPassword(email, code, newPassword);
      console.log("✅ Kết quả trả về từ API /reset-password:", res);
      Toast.show({
        type: 'success',
        text1: t('forgotPassword.toast.resetSuccess'),
        text2: t('forgotPassword.toast.resetSuccessMessage')
      });
      setEmail("");
      setCode("");
      setNewPassword("");
      onDone?.();
    } catch (err: any) {
      console.error("❌ Lỗi trong handleResetPassword:", err);
      Toast.show({
        type: 'error',
        text1: t('common.errorTitle'),
        text2: err.message || t('forgotPassword.toast.resetFailed')
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('forgotPassword.title')}</Text>

      <View style={styles.row}>
        <TextInput
          placeholder={t('forgotPassword.emailLabel')}
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleRequestReset}
          disabled={sending}
        >
          <Text style={styles.sendBtnText}>
            {sending ? t('forgotPassword.sendingButton') : t('forgotPassword.sendButton')}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder={t('forgotPassword.codeLabel')}
        placeholderTextColor="#888"
        value={code}
        onChangeText={setCode}
        style={styles.input}
      />

      <TextInput
        placeholder={t('forgotPassword.newPasswordLabel')}
        placeholderTextColor="#888"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={styles.resetBtn} onPress={handleResetPassword}>
        <Text style={styles.resetBtnText}>{t('forgotPassword.resetButton')}</Text>
      </TouchableOpacity>

      <Text style={styles.backText} onPress={onDone}>
        {t('forgotPassword.backLink')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 26,
    textAlign: "center",
    color: "#05fae5",
    fontWeight: "700",
    marginBottom: 25,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#05fae5",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  sendBtn: {
    marginLeft: 8,
    top: -8,
    width: 60,
    height: 55,
    backgroundColor: "#05fae5",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 15,
  },
  resetBtn: {
    backgroundColor: "#05fae5",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 5,
  },
  resetBtnText: {
    color: "#000",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 18,
  },
  backText: {
    color: "#05fae5",
    textAlign: "center",
    marginTop: 25,
    fontSize: 16,
  },
});

export default ForgotPasswordModule;
