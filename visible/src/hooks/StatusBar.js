// hooks/useThemedStatusBar.js
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Platform, StatusBar } from 'react-native';

const useThemedStatusBar = (isDarkMode) => {
    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');

            if (Platform.OS === 'android') {
                StatusBar.setBackgroundColor(isDarkMode ? '#0f0c29' : '#89f7fe');
            }
        }, [isDarkMode])
    );
};

export default useThemedStatusBar;
