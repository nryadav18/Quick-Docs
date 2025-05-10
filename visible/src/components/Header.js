import React, { useContext, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const Header = ({ title }) => {
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const rotateValue = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(rotateValue, {
            toValue: isDarkMode ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isDarkMode]); // Run animation when theme changes

    const toggleDarkMode = () => {
        toggleTheme(); // Toggle the theme (which will trigger useEffect)
    };

    const rotateIcon = rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });

    return (
        <SafeAreaView style={[styles.safeArea, isDarkMode && styles.darkSafeArea]}>
            <View style={[styles.header, isDarkMode && styles.darkHeader]}>
                {/* Title */}
                <Text style={[styles.title, isDarkMode && styles.darkTitle]}>{title}</Text>

                {/* Toggle Button */}
                <TouchableOpacity onPress={toggleDarkMode} style={styles.toggleButton}>
                    <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
                        <Ionicons
                            name={isDarkMode ? "sunny" : "moon"}
                            size={24}
                            color={isDarkMode ? "#FFD700" : "black"}
                        />
                    </Animated.View>
                </TouchableOpacity>
            </View>
            <View style={styles.bottomLine} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#89f7fe',
    },
    darkSafeArea: {
        backgroundColor: '#0f0c29',
    },
    header: {
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bottomLine: {
        height: 3,
        backgroundColor: '#a8adaa',
        width: '100%',
        alignSelf: 'center', // center the line
        marginBottom: 6,
        borderRadius : 10
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'black',
    },
    darkTitle: {
        color: '#F5F5F5',
    },
    toggleButton: {
        padding: 10,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
    },
});

export default Header;
