// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiIvzm9mTldxg3LKEoiZYhV9gZAwPBDy0",
  authDomain: "music-app-11027.firebaseapp.com",
  projectId: "music-app-11027",
  storageBucket: "music-app-11027.firebasestorage.app",
  messagingSenderId: "299703065655",
  appId: "1:299703065655:web:5fab7a4572da3a0b5173b2"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);