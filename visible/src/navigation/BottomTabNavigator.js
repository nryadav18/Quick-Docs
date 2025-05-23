import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome5 } from 'react-native-vector-icons';
import ViewFilesScreen from '../screens/ViewFilesScreen';
import UploadFilesScreen from '../screens/UploadFilesScreen';
import AIScreen from '../screens/AIScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VoiceToVoiceScreen from '../screens/VoiceToVoiceScreen';
import Header from '../components/Header';
import { ThemeContext } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
    const { isDarkMode } = useContext(ThemeContext);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                header: () => <Header title={route.name} />,
                tabBarIcon: ({ color, size }) => {
                    let iconName;
                    if (route.name === 'Files') iconName = 'folder-open';
                    else if (route.name === 'Upload') iconName = 'cloud-upload-alt';
                    else if (route.name === 'Agent-QD') iconName = 'robot';
                    else if (route.name === 'Profile') iconName = 'user-alt';
                    else if (route.name === 'V2V') iconName = 'microphone-alt';
                    return <FontAwesome5 name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#00796b',
                tabBarInactiveTintColor: isDarkMode ? '#BBB' : 'gray',
                tabBarStyle: [
                    styles.tabBar,
                    isDarkMode ? styles.darkTabBar : styles.lightTabBar,
                ],
            })}
        >
            <Tab.Screen name="Files" component={ViewFilesScreen} />
            <Tab.Screen name="Upload" component={UploadFilesScreen} />
            <Tab.Screen name="Agent-QD" component={AIScreen} />
            <Tab.Screen name="V2V" component={VoiceToVoiceScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: 60,
        paddingBottom: 5,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: 0,
        elevation: 8, // Works in Android
    },
    lightTabBar: {
        backgroundColor: '#f8f8f8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    darkTabBar: {
        backgroundColor: '#1E1E1E',
        shadowColor: 'rgba(255,255,255,0.2)', // White shadow for dark mode
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', // Light border effect
    },
});
