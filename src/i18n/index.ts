import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import các file ngôn ngữ của bạn
import en from './en.json';
import vi from './vi.json';

// Chúng ta không cần dòng này nữa, vì ta sẽ đặt mặc định là 'en'
// const deviceLanguage = Localization.getLocales()[0].languageCode ?? 'en';

i18next
  .use(initReactI18next) // Binds react-i18next to i18next
  .init<any>({
    // Nguồn tài nguyên ngôn ngữ
    resources: {
      en: {
        translation: en,
      },
      vi: {
        translation: vi,
      },
    },

    // <<< THAY ĐỔI TẠI ĐÂY >>>
    // Ngôn ngữ mặc định
    lng: 'en', // Luôn luôn bắt đầu bằng Tiếng Anh

    // Ngôn ngữ dự phòng nếu không tìm thấy key
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false, // React đã an toàn (XSS safe)
    },
    compatibilityJSON: 'v4', // Giữ nguyên v4 của bạn
  });

// <<< SỬA LỖI: XÓA DÒNG DƯỚI ĐÂY >>>
// export default i18next;