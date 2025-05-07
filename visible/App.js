import React, { useEffect, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import StackNavigator from './src/navigation/StackNavigator';
import { StatusBar } from 'react-native';
import useUserStore from './src/store/userStore';
import AsyncStorage from '@react-native-async-storage/async-storage'; // don't forget this import
import axios from 'axios';

const AppContent = () => {
    const { setUser, setToken } = useUserStore();
    const { isDarkMode } = useContext(ThemeContext); // get dark mode state

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

        loadUser();
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
