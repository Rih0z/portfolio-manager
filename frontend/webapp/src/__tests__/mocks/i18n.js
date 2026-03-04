import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  lng: 'ja',
  fallbackLng: 'ja',
  ns: ['translation'],
  defaultNS: 'translation',
  resources: {
    ja: {
      translation: {},
    },
    en: {
      translation: {},
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
