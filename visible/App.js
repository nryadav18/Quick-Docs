import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/context/ThemeContext';
import StackNavigator from './src/navigation/StackNavigator';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import useUserStore from './src/store/userStore';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import * as SecureStore from 'expo-secure-store';
import './firebaseConfig';
import { BACKEND_URL } from '@env';

// Setup notification handler (optional but recommended)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const AppContent = () => {
    const { setUser, setToken, loadToken, alreadyLoggedIn, setAlreadyLoggedIn } = useUserStore();
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const storedToken = await SecureStore.getItemAsync('user_token');
                if (storedToken) {
                    // Fetch user from your API using the stored token
                    const response = await fetch(`${BACKEND_URL}/user`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${storedToken}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        setToken(storedToken);
                        setAlreadyLoggedIn(true)
                    } else {
                        console.warn('Token invalid or expired');
                        await SecureStore.deleteItemAsync('user_token');
                    }
                }
            } catch (error) {
                console.error('Failed to auto-load user session:', error);
            } finally {
                setLoadingAuth(false);  // done loading no matter what
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

        const requestMicrophonePermission = async () => {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: 'Microphone Permission',
                        message: 'This app needs access to your microphone for speech recognition.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    },
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
            return true;
        };

        requestNotificationPermission();
        requestDownloadPermission();
        requestMicrophonePermission();
    }, []);

    if (loadingAuth) {
        return null;
    }

    return (
        <NavigationContainer>
            <StackNavigator alreadyLoggedIn={alreadyLoggedIn} />
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
