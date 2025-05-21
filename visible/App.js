import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/context/ThemeContext';
import StackNavigator from './src/navigation/StackNavigator';
import { StatusBar, Alert, Platform } from 'react-native';
import useUserStore from './src/store/userStore';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import './firebaseConfig';

// Setup notification handler (optional but recommended)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const AppContent = () => {
    const { setUser, setToken, loadToken } = useUserStore(); // ← Added `loadToken`


    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const storedToken = await SecureStore.getItemAsync('user_token');
                if (storedToken) {
                    // Optionally validate the token with backend
                    useUserStore.getState().setToken(storedToken);

                    // Optional: fetch user data using the token
                    const response = await fetch('https://yourapi.com/auth/me', {
                        headers: { Authorization: `Bearer ${storedToken}` },
                    });
                    const userData = await response.json();
                    if (response.ok) {
                        useUserStore.getState().setUser(userData);
                    } else {
                        // Token is invalid
                        useUserStore.getState().clearUser();
                        await SecureStore.deleteItemAsync('user_token');
                    }
                }
            } catch (error) {
                console.error('Failed to auto-load user session:', error);
            }
        };

        initializeAuth();
    }, []);


    useEffect(() => {
        // Load token securely from SecureStore on app start
        const initializeApp = async () => {
            await loadToken();
        };
        initializeApp();
    }, []);

    useEffect(() => {
        StatusBar.setBarStyle('dark-content');
        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#89f7fe'); // Your theme
        }
    }, []);

    useEffect(() => {
        const subscriptionReceived = Notifications.addNotificationReceivedListener(() => {
            console.log('Notification Received');
        });

        const subscriptionResponse = Notifications.addNotificationResponseReceivedListener(() => {
            console.log('Notification Response');
        });

        return () => {
            subscriptionReceived.remove();
            subscriptionResponse.remove();
        };
    }, []);

    useEffect(() => {
        const requestNotificationPermission = async () => {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                const { status: newStatus } = await Notifications.requestPermissionsAsync();
                if (newStatus !== 'granted') {
                    Alert.alert(
                        "Permission Needed",
                        "Please allow notifications to receive updates and reminders."
                    );
                }
            }
        };

        const requestDownloadPermission = async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Storage permission is required to download files.'
                );
            }
        };

        requestNotificationPermission();
        requestDownloadPermission();
    }, []);

    return (
        <NavigationContainer>
            <StackNavigator />
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}
