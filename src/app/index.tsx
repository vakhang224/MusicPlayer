// MusicPlayer/src/app/index.tsx
import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
} from "react-native";
import Animated, { SlideInRight, SlideOutRight } from "react-native-reanimated";
import { login as loginService, register } from "@/services/authService";
import ForgotPasswordModule from "@/app/(module)/ForgotPasswordModule";
import { useAuth } from "@/context/AuthContext";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useLibraryStore } from "@/store/library";

const { width } = Dimensions.get("window");

export default function IndexScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Toast.show({
        type: "error",
        text1: t("common.missingInfoTitle"),
        text2: t("login.toast.missingInfoLogin"),
      });
      return;
    }

    try {
      console.log("Attempting login...");
      const res = await loginService(username, password);
      console.log("Login service response:", res);

      if (res && res.accessToken) {
        await login();
        setPassword("");

        // Ensure recommendations are reloaded for the newly authenticated user
        try {
          await useLibraryStore.getState().loadRecommendations();
        } catch (e) {
          console.warn("[Login] loadRecommendations failed:", (e as any)?.message || e);
        }
      } else {
        Toast.show({
          type: "error",
          text1: t("login.toast.loginFailed"),
          text2: res?.message || t("login.toast.loginFailedMessage"),
        });
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      Toast.show({
        type: "error",
        text1: t("common.errorTitle"),
        text2: err?.message || "An unexpected error occurred during login.",
      });
    }
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Toast.show({
        type: "error",
        text1: t("common.missingInfoTitle"),
        text2: t("login.toast.missingInfoRegister"),
      });
      return;
    }

    try {
      const res = await register(username, email, password, name);

      // Consider registration successful if server returns id OR
      // returns a message that clearly indicates success (handle flaky API)
      const messageLower = (res?.message || "").toString().toLowerCase();
      const looksLikeSuccess =
        Boolean(res && (res.id || res.userId || res.accessToken)) ||
        messageLower.includes("success") ||
        messageLower.includes("thành công") ||
        messageLower.includes("đăng ký thành công") ||
        messageLower.includes("registered");

      if (looksLikeSuccess) {
        Toast.show({
          type: "success",
          text1: t("login.toast.registerSuccess"),
          text2: t("login.toast.registerSuccessMessage"),
        });

        // Clear form and switch to login view
        setIsRegister(false);
        setPassword("");
        setEmail("");
        setName("");
        // Navigate user to login route (index is login screen). If you have a dedicated login route, update path.
        try {
          router.push("/"); // push root (login). Adjust if your login route is different.
        } catch (navErr) {
          console.warn("Navigation after register failed:", navErr);
        }
        return;
      }

      // If not successful, determine a useful error message
      const serverMsg = res?.message;
      const isErrorMessage =
        typeof serverMsg === "string" &&
        serverMsg.trim() !== "" &&
        !serverMsg.toString().toLowerCase().includes("thành công") &&
        !serverMsg.toString().toLowerCase().includes("success");

      Toast.show({
        type: "error",
        text1: t("login.toast.registerFailed"),
        text2: isErrorMessage ? serverMsg : t("common.errorTitle"),
      });
    } catch (err: any) {
      console.error("REGISTER ERROR:", err);
      Toast.show({
        type: "error",
        text1: t("common.errorTitle"),
        text2: err?.message || "Registration failed due to network or server error.",
      });
    }
  };

  // Show Forgot Password screen if toggled
  if (showForgotPassword) {
    return (
      <Animated.View
        entering={SlideInRight.duration(300)}
        exiting={SlideOutRight.duration(300)}
        style={{ flex: 1 }}
      >
        <ForgotPasswordModule onDone={() => setShowForgotPassword(false)} />
      </Animated.View>
    );
  }

  // JSX
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isRegister ? t("login.registerTitle") : t("login.loginTitle")}
      </Text>

      <TextInput
        placeholder={t("login.usernameLabel")}
        placeholderTextColor="#888"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      {isRegister && (
        <>
          <TextInput
            placeholder={t("login.displayNameLabel")}
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder={t("login.emailLabel")}
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
          />
        </>
      )}

      <TextInput
        placeholder={t("login.passwordLabel")}
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={isRegister ? handleRegister : handleLogin}
      >
        <Text style={styles.buttonText}>
          {isRegister ? t("login.registerButton") : t("login.loginButton")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
        <Text style={styles.link}>{t("login.forgotPasswordLink")}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.link}>
          {isRegister ? t("login.loginLink") : t("login.registerLink")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    color: "#05fae5",
    fontWeight: "700",
    marginBottom: 30,
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
  button: {
    backgroundColor: "#05fae5",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 5,
  },
  buttonText: {
    textAlign: "center",
    color: "#000",
    fontSize: 18,
    fontWeight: "600",
  },
  link: {
    textAlign: "center",
    color: "#05fae5",
    marginTop: 15,
    fontSize: 15,
  },
});
