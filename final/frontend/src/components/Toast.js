import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Toast from 'react-native-toast-message'; // Import the Toast library
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/i18n';

export const showToast = (type, text1, text2 = '', options = {}) => {
  const safeText1 = String(text1 || '');
  const safeText2 = String(text2 || '');
  
  Toast.show({
    type: type || 'info', // info, success, error, etc
    position: options.position || 'bottom',
    text1: safeText1,
    text2: safeText2,
    visibilityTime: options.duration || 3000,
    autoHide: options.autoHide !== false,
    topOffset: options.topOffset || 40,
    bottomOffset: options.bottomOffset || 40,
    ...options
  });
};

export const showSuccessToast = (messageKey, params = {}, options = {}) => {
  try {
    const text1 = String(i18n.t(`common.success`));
    const text2 = String(i18n.t(messageKey, params));
    showToast('success', text1, text2, options);
  } catch (error) {
    console.error('Error showing success toast:', error);
    showToast('success', 'Success', String(messageKey), options);
  }
};

export const showErrorToast = (messageKey, params = {}, options = {}) => {
  try {
    const text1 = String(i18n.t(`common.error`));
    const text2 = String(i18n.t(messageKey, params));
    showToast('error', text1, text2, options);
  } catch (error) {
    console.error('Error showing error toast:', error);
    showToast('error', 'Error', String(messageKey), options);
  }
};

export const showInfoToast = (messageKey, params = {}, options = {}) => {
  try {
    const text1 = String(i18n.t(messageKey, params));
    showToast('info', text1, '', options);
  } catch (error) {
    console.error('Error showing info toast:', error);
    showToast('info', String(messageKey), '', options);
  }
};

const AppStateToastListener = () => {
  const backgroundStartTimeRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        if (backgroundStartTimeRef.current) {
          const now = new Date();
          const timeInBackground = now - backgroundStartTimeRef.current;
          const seconds = Math.round(timeInBackground / 1000);

          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          const formattedTime = minutes
            ? `${minutes}m ${remainingSeconds}s`
            : `${remainingSeconds}s`;

          showToast(
            'info',
            String(t('lifecycle.backgroundTime')),
            String(formattedTime),
            { visibilityTime: 3000 }
          );

          backgroundStartTimeRef.current = null;
        }
      } else if (nextAppState === 'background') {
        backgroundStartTimeRef.current = new Date();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [t]);

  return null;
};

export default AppStateToastListener;
