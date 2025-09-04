import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 翻訳リソースを動的に読み込み（プロダクションビルド対応）
const enTranslations = require('./locales/en.json');
const jaTranslations = require('./locales/ja.json');

const resources = {
  en: {
    translation: enTranslations
  },
  ja: {
    translation: jaTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ja', // デフォルト言語を日本語に設定
    supportedLngs: ['ja', 'en'], // サポートする言語を明示的に指定
    debug: process.env.NODE_ENV === 'development',
    
    // 言語検出の設定
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      // より安定した検出オプション
      convertDetectedLanguage: (lng) => lng.split('-')[0] // en-US -> en
    },
    
    interpolation: {
      escapeValue: false, // React では XSS 対策が既に行われているため
    },
    
    // 名前空間を使用しない
    ns: 'translation',
    defaultNS: 'translation',
  });

export default i18n;