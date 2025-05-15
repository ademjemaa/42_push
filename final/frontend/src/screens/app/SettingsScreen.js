import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18next from '../../../i18n/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalOrientation } from '../../contexts/OrientationContext';

const SettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { headerColor, updateHeaderColor, colorOptions } = useTheme();
  const { logout } = useAuth();
  const { isPortrait } = useGlobalOrientation();
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  
  // Change app language
  const changeLanguage = (languageCode) => {
    i18next.changeLanguage(languageCode);
    setShowLanguageModal(false);
  };
  
  // Change header color
  const changeHeaderColor = (color) => {
    updateHeaderColor(color);
    setShowColorModal(false);
  };
  
  // Get current language display name
  const getCurrentLanguage = () => {
    const currentLang = i18next.language;
    return currentLang === 'fr' ? t('settings.french') : t('settings.english');
  };
  
  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      t('common.logout'),
      t('settings.logoutConfirmation'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.logout'),
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'bottom', 'left']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Appearance section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.theme')}</Text>
          
          {/* Header color */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowColorModal(true)}>
            <View style={styles.sectionContent}>
              <Ionicons name="color-palette" size={24} color={headerColor} style={styles.sectionIcon} />
              <Text style={styles.settingTitle}>{t('settings.headerColor')}</Text>
            </View>
            <View style={styles.colorPreview}>
              <View style={[styles.colorDot, { backgroundColor: headerColor }]} />
              <Ionicons name="chevron-forward" size={20} color="gray" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Preferences section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Preferences</Text>
          
          {/* Language */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.sectionContent}>
              <Ionicons name="language" size={24} color={headerColor} style={styles.sectionIcon} />
              <Text style={styles.settingTitle}>{t('settings.language')}</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{getCurrentLanguage()}</Text>
              <Ionicons name="chevron-forward" size={20} color="gray" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Version and Logout section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Info</Text>
          
          {/* Version */}
          <View style={styles.settingRow}>
            <View style={styles.sectionContent}>
              <Ionicons name="code" size={24} color={headerColor} style={styles.sectionIcon} />
              <Text style={styles.settingTitle}>{t('settings.version')}</Text>
            </View>
            <Text style={styles.versionText}>1.0.0</Text>
          </View>
          
          {/* Logout */}
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <View style={styles.sectionContent}>
              <Ionicons name="log-out" size={24} color="#FF3B30" style={styles.sectionIcon} />
              <Text style={styles.logoutText}>{t('common.logout')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Language selection modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => changeLanguage('en')}
            >
              <Text style={styles.modalOptionText}>{t('settings.english')}</Text>
              {i18next.language === 'en' && (
                <Ionicons name="checkmark" size={20} color={headerColor} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => changeLanguage('fr')}
            >
              <Text style={styles.modalOptionText}>{t('settings.french')}</Text>
              {i18next.language === 'fr' && (
                <Ionicons name="checkmark" size={20} color={headerColor} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: headerColor }]}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Color selection modal */}
      <Modal
        visible={showColorModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.selectColor')}</Text>
            
            <FlatList
              key={`color-grid-${isPortrait ? 'portrait' : 'landscape'}`}
              data={colorOptions}
              keyExtractor={(item) => item.value}
              numColumns={isPortrait ? 4 : 8}
              contentContainerStyle={styles.colorGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: item.value },
                    headerColor === item.value && styles.selectedColorOption
                  ]}
                  onPress={() => changeHeaderColor(item.value)}
                >
                  {headerColor === item.value && (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: headerColor }]}
              onPress={() => setShowColorModal(false)}
            >
              <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    color: 'gray',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  settingTitle: {
    fontSize: 16,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    marginRight: 6,
    color: 'gray',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  versionText: {
    color: 'gray',
    fontSize: 14,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  colorGrid: {
    paddingVertical: 10,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: 'white',
  },
});

export default SettingsScreen; 