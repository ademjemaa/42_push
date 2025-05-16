import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { translations } from './translations';

// Get the device language with fallback - completely avoiding split
const getLanguage = () => {
  try {
    // Check if locale exists and has the expected format
    if (Localization && Localization.locale && typeof Localization.locale === 'string') {
      // Use startsWith instead of split for safety
      if (Localization.locale.startsWith('fr')) {
        return 'fr';
      }
    }
    return 'en'; // Default to English in all other cases
  } catch (error) {
    console.warn('Error determining language:', error);
    return 'en'; // Default to English on error
  }
};

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
    lng: getLanguage(), // Use the safer function
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3'
  });

export default i18next; 