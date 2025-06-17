import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/context/ThemeContext';
import StackNavigator from './src/navigation/StackNavigator';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import useUserStore from './src/store/userStore';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import * as SecureStore from 'expo-secure-store';
import './firebaseConfig'
import LoadingScreen from './src/screens/LoadingScreen';
import { BACKEND_URL } from '@env';
import { Text, TextInput } from 'react-native';


// Setup notification handler (optional but recommended)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const AppContent = () => {
    const { setUser, setToken, loadToken, alreadyLoggedIn, setAlreadyLoggedIn, setDeviceExpoNotificationToken } = useUserStore();
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [progress, setProgress] = useState(0);

    const updateProgress = (value) => {
        setProgress(prev => (value > prev ? value : prev));
    };

    // Force disable scaling
    if (Text.defaultProps == null) Text.defaultProps = {};
    Text.defaultProps.allowFontScaling = false;

    if (TextInput.defaultProps == null) TextInput.defaultProps = {};
    TextInput.defaultProps.allowFontScaling = false;


    useEffect(() => {
        const originalConsoleError = console.error;

        console.error = (...args) => {
            // Prevent red screen overlay in dev
            originalConsoleError(...args);
            // You could also send this to Sentry or log somewhere
        };

        return () => {
            console.error = originalConsoleError;
        };
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                updateProgress(10);
                const storedToken = await SecureStore.getItemAsync('user_token');
                updateProgress(30);
                if (storedToken) {
                    updateProgress(50);
                    // Fetch user from your API using the stored token
                    const response = await fetch(`${BACKEND_URL}/user`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${storedToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    updateProgress(70);

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        setToken(storedToken);
                        setAlreadyLoggedIn(true);
                        updateProgress(85);
                        let token;
                        try {
                            token = (await Notifications.getExpoPushTokenAsync()).data;
                            setDeviceExpoNotificationToken(token)
                        } catch (error) {
                            console.error("Error fetching push token:", error);
                        }
                    } else {
                        console.warn('Token invalid or expired');
                        await SecureStore.deleteItemAsync('user_token');
                    }
                }
                updateProgress(95);
            } catch (error) {
                console.error('Failed to auto-load user session:', error);
            } finally {
                updateProgress(100);
                setTimeout(() => setLoadingAuth(false), 500); // delay to show 100% progress
            }
        };

        initializeAuth();
        console.log(BACKEND_URL)
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
                requestDownloadPermission();
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
                    }
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert(
                        'Microphone Permission Denied',
                        'Speech features will not work without microphone access.'
                    );
                    return false;
                }
            }
            return true;
        };

        requestNotificationPermission();
        requestDownloadPermission();
        requestMicrophonePermission();
    }, []);

    if (loadingAuth) {
        return (
            <LoadingScreen progress={progress} />
        );
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
