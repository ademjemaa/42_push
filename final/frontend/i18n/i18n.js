import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { translations } from './translations';

// Initialize i18next
i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: translations.en
      },
      fr: {
        translation: translations.fr
      }
    },
    lng: Localization.locale.split('-')[0] === 'fr' ? 'fr' : 'en', // Default to English if not French
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3'
  });

export default i18next; 