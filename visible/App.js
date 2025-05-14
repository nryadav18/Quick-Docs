import React, { useState, useEffect, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import StackNavigator from './src/navigation/StackNavigator';
import { StatusBar, Alert, Platform } from 'react-native';
import useUserStore from './src/store/userStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import './firebaseConfig';
import * as Device from 'expo-device';

// Setup notification handler (optional but recommended)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

const AppContent = () => {
    const { setUser, setToken } = useUserStore();
    const { isDarkMode } = useContext(ThemeContext);

    useEffect(() => {
        const subscriptionReceived = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification Received:', notification);
        });

        const subscriptionResponse = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification Response:', response);
        });

        return () => {
            subscriptionReceived.remove();
            subscriptionResponse.remove();
        };
    }, []);


    useEffect(() => {
        const loadUser = async () => {
            const token = await AsyncStorage.getItem("userToken");
            const userId = await AsyncStorage.getItem("userId");

            if (token && userId) {
                try {
                    const response = await axios.get(`https://quick-docs-app-backend.onrender.com/user/${userId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUser(response.data);
                    setToken(token);
                } catch (error) {
                    console.log("Failed to fetch user data:", error);
                    await AsyncStorage.clear();
                }
            }
        };

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

        loadUser();
        requestNotificationPermission();
    }, []);

    return (
        <>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={isDarkMode ? "#0f0c29" : "#89f7fe"}
            />
            <NavigationContainer>
                <StackNavigator />
            </NavigationContainer>
        </>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}
